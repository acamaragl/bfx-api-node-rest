/* eslint-env mocha */
'use strict'

const assert = require('assert')
const _isString = require('lodash/isString')
const _isEmpty = require('lodash/isEmpty')
const SocksProxyAgent = require('socks-proxy-agent')
const proxyquire = require('proxyquire')
const { stub } = require('sinon')

const rpStub = stub()

const RESTv2 = proxyquire('../../lib/rest2', {
  'node-fetch': rpStub.resolves(null)
})

// TODO: Move other tests here where appropriate (unit)

describe('RESTv2', () => {
  describe('default connection url', () => {
    it('is a static member on the class', () => {
      assert.ok(_isString(RESTv2.url) && !_isEmpty(RESTv2.url))
    })
  })

  describe('getURL', () => {
    it('returns the URL the instance was constructed with', () => {
      const rest = new RESTv2({ url: 'test' })
      assert.strictEqual(rest.getURL(), 'test', 'instance does not use provided URL')
    })
  })

  describe('usesAgent', () => {
    it('returns true if an agent was passed to the constructor', () => {
      const rest = new RESTv2({
        agent: new SocksProxyAgent('socks4://127.0.0.1:9998')
      })

      assert.ok(rest.usesAgent(), 'usesAgent() does not indicate agent presence when one was provided')
    })

    it('returns false if no agent was passed to the constructor', () => {
      const rest = new RESTv2()
      assert.ok(!rest.usesAgent(), 'usesAgent() indicates agent presence when none provided')
    })
  })

  describe('trades', () => {
    it('correctly builds query string', (done) => {
      const rest = new RESTv2()

      rest._makePublicRequest = (url) => {
        assert.strictEqual(url, '/trades/tBTCUSD/hist?start=1&end=2&limit=3&sort=4')
        done()
      }

      const params = { symbol: 'tBTCUSD', start: 1, end: 2, limit: 3, sort: 4 }
      rest.trades(params)
    })
  })

  describe('request body', () => {
    it('excludes nullish', () => {
      const rest = new RESTv2()
      rest._apiKey = 'key'
      rest._apiSecret = 'secret'
      rest._makeAuthRequest('path', { a: 1, b: '', c: null, d: undefined })

      assert(rpStub.lastCall, 'should be called')
      const reqOpts = rpStub.lastCall.args[1]

      assert.equal(typeof reqOpts, 'object', 'argument isnt an object')
      assert.deepStrictEqual(reqOpts.body, JSON.stringify({ a: 1, b: '' }))
    })
  })

  describe('listener methods', () => {
    const testMethod = (name, url, method, ...params) => {
      describe(name, () => {
        it('calls correct endpoint', (done) => {
          const rest = new RESTv2()
          rest[method] = (reqURL) => {
            assert.strictEqual(reqURL, url)
            done()
          }
          rest[name](...params)
        })
      })
    }

    // TODO: add rest...
    testMethod('symbols', '/conf/pub:list:pair:exchange', '_makePublicRequest', {})
    testMethod('inactiveSymbols', '/conf/pub:list:pair:exchange:inactive', '_makePublicRequest', {})
    testMethod('futures', '/conf/pub:list:pair:futures', '_makePublicRequest', {})
    testMethod('ledgers', '/auth/r/ledgers/hist', '_makeAuthRequest', {})
    testMethod('ledgers', '/auth/r/ledgers/USD/hist', '_makeAuthRequest', { filters: 'USD' })
    testMethod('publicPulseProfile', '/pulse/profile/Bitfinex', '_makePublicRequest', { nickname: 'Bitfinex' })
    testMethod('addPulse', '/auth/w/pulse/add', '_makeAuthRequest', {})
    testMethod('addPulseComment', '/auth/w/pulse/add', '_makeAuthRequest', { parent: 'parent', content: 'content' })
    testMethod('fetchPulseComments', '/auth/r/pulse/hist', '_makeAuthRequest', { parent: 'parent' })
    testMethod('deletePulse', '/auth/w/pulse/del', '_makeAuthRequest', {})
    testMethod('publicPulseHistory', '/pulse/hist?limit=2&end=1589559090651', '_makePublicRequest', { limit: 2, end: 1589559090651 })
    testMethod('pulseHistory', '/auth/r/pulse/hist', '_makeAuthRequest', {})
    testMethod('generateInvoice', '/auth/w/deposit/invoice', '_makeAuthRequest', {})
    testMethod('marketAveragePrice', '/calc/trade/avg?symbol=fUSD&amount=100', '_makePublicPostRequest', { symbol: 'fUSD', amount: 100 })
    testMethod('keepFunding', '/auth/w/funding/keep', '_makeAuthRequest', { type: 'type', id: 'id' })
    testMethod('cancelOrderMulti', '/auth/w/order/cancel/multi', '_makeAuthRequest', { id: [123] })
    testMethod('orderMultiOp', '/auth/w/order/multi', '_makeAuthRequest', { ops: [['oc_multi', { id: [1] }]] })
    testMethod('invalidateAuthToken', '/auth/w/token/del', '_makeAuthRequest', { authToken: 'token' })
    testMethod('payInvoiceCreate', '/auth/w/ext/pay/invoice/create', '_makeAuthRequest', {})
    testMethod('payInvoiceList', '/auth/r/ext/pay/invoices', '_makeAuthRequest', {})
    testMethod('payInvoiceComplete', '/auth/w/ext/pay/invoice/complete', '_makeAuthRequest', {})
    testMethod('payDepositsUnlinked', '/auth/r/ext/pay/deposits/unlinked', '_makeAuthRequest', {})
  })
})
