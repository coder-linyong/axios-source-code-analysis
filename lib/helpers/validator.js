'use strict'

var VERSION = require('../env/data').version

var validators = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function (type, i) {
  validators[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type
  }
})

var deprecatedWarnings = {}

/**
 * 过渡选项验证器
 * @param {function|boolean?} validator - 如果已移除过渡选项，则设置为false
 * @param {string?} version - 自版本起删除的已弃用版本
 * @param {string?} message - 一些带有附加信息的消息
 * @returns {function}
 */
validators.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '')
  }

  // eslint-disable-next-line func-names
  return function (value, opt, opts) {
    if (validator === false) {
      throw new Error(formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')))
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      )
    }

    return validator ? validator(value, opt, opts) : true
  }
}

/**
 * 断言对象的属性类型，如果有属性不通过断言则抛出错误
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 */
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new TypeError('options must be an object')
  }
  var keys = Object.keys(options)
  var i = keys.length
  while (i-- > 0) {
    //键
    var opt = keys[i]
    //校验器
    var validator = schema[opt]
    if (validator) {
      //值
      var value = options[opt]
      var result = value === undefined || validator(value, opt, options)
      if (result !== true) {
        throw new TypeError('option ' + opt + ' must be ' + result)
      }
      continue
    }
    if (allowUnknown !== true) {
      throw Error('Unknown option ' + opt)
    }
  }
}

module.exports = {
  assertOptions: assertOptions,
  validators: validators
}
