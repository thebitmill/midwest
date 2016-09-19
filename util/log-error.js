/*
 * Module that logs errors to console
 * and/or database.
 *
 * This module expects a config file located
 * at `server/config/error-handler`.
 *
 * @module midwest/util/log-error
 */

'use strict'

const _ = require('lodash')

// modules > native
const p = require('path')

// modules > 3rd party
const chalk = require('chalk')

//modules > internal
const colorizeStack = require('./colorize-stack')
const formatError = require('./format-error')

// string added to all errors logged to console
const prefix = '[' + chalk.red('EE') + '] '

const _config = require(p.join(process.cwd(), 'server/config/error-handler')).log

/*
 * Default console logging function. Will be used
 * if `config.console` is not set or is not a function.
 *
 * @private
 */
function defaultConsole(error) {
  // note unformatted error will not have any own properties to loop over. ie,
  // format needs to be called first
  let status
  let message
  if (!_config.all && error.status < 400) {
    status = chalk.cyan(error.status)
  } else if (!_config.all && error.status < 500) {
    status = chalk.yellow(error.status)
  } else {
    status = chalk.red(error.status)
    message = '[' + error.name + '] ' + error.message
  }

  status = chalk.bold(status)

  console.error(prefix + status + ' ' + (message || error.message))
  if (error.status === 422) {
    console.error(prefix + 'details: ' + JSON.stringify(error.details, null, '  '))
  }
  //for (const prop in error) {
  //  // TODO pretty print stack
  //  if (prop !== 'stack') {
  //    console.error(prefix + prop + ': ' + JSON.stringify(error[prop]))
  //  }
  //}

  if (error.stack) {
    console.error(prefix + colorizeStack(error.stack.slice(error.stack.indexOf('\n') + 1)).trim() + '\n')
  }
}

/*
 * Logs the error.
 *
 * @param {Error} error - Error to be logged
 * @param {IncomingMessage} req - Request object of current request.
 * Used to add additional info to error such as logged in user.
 * @param {Object} config - Optional config object to override the default
 * config on a per log basis.
 */
module.exports = function logError(error, req, config) {
  config = _.defaults(config || {}, _config)

  if (config.format !== false)
    error = (_.isFunction(config.format) ? config.format : formatError)(error, req)

  let logConsole
  let logStore

  if (config.console)
    logConsole = _.isFunction(config.console) ? config.console : defaultConsole

  if (_.isFunction(config.store))
    logStore = config.store

  if (config.ignore.indexOf(error.status) < 0) {
    if (logConsole) {
      logConsole(error)
    }

    if (logStore) {
      logStore(error)
    }
  }
}
