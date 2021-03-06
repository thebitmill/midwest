'use strict'

// modules > 3rd party
const _ = require('lodash')
const ua = require('useragent')

module.exports = function (config) {
  config = config || require('./example/config/shim')

  const allShims = []

  // returns { family: [[ url, operator, majorVersion ]] }
  const allTests = _.reduce(config.shims, (result, value, script) => {
    value.forEach((str) => {
      // str will be 'samsung internet <= 1' or similar
      const arr = str.split(' ')

      // chrome or 'samsung internet'
      const family = arr.slice(0, -2).join(' ')

      // operator is <=, >=... and major is major version number
      const [operator, major] = arr.slice(-2)

      if (!result[family]) {
        result[family] = []
      }

      allShims.push(script)

      result[family].push([script, operator, parseInt(major, 10)])
    })

    return result
  }, {})

  return function shim (req, res, next) {
    if (req.xhr || req.accepts(['json', '*/*']) === 'json') return next()

    let os
    let device
    let result = req.session && req.session.ua

    if (!result) {
      result = ua.parse(req.headers['user-agent'])

      if (config.os) {
        os = result.os
      }

      if (config.device) {
        device = result.device
      }

      if (config.session && req.session) {
        req.session.ua = {}
        Object.assign(req.session.ua, result, os && { os }, device && { device })
      }
    }

    const { family, major: uaVersion } = ua.lookup(req.headers['user-agent'])

    const tests = allTests[family.toLowerCase()]

    if (tests) {
      const scripts = []

      for (let i = 0; i < tests.length; i += 1) {
        const [script, operator, version] = tests[i]

        switch (operator) {
          case '<':
            if (uaVersion < version) scripts.push(script)
            break
          case '<=':
            if (uaVersion <= version) scripts.push(script)
            break
          case '>':
            if (uaVersion > version) scripts.push(script)
            break
          case '>=':
            if (uaVersion >= version) scripts.push(script)
            break
          case '==':
          case '===':
            if (uaVersion === version) scripts.push(script)
            break
          case '!=':
          case '!==':
            if (uaVersion !== version) scripts.push(script)
            break
          default:
            throw new Error('Invalid operator')
        }
      }

      if (scripts.length) {
        res.locals.scripts = scripts
      }
    } else {
      // add all shims for unknown browsers
      res.locals.scripts = allShims
    }

    next()
  }
}
