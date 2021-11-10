'use strict'

var utils = require('../utils')

/**
 * 特定于配置的合并函数，该函数通过将两个配置对象合并在一起来创建新的配置对象。
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} 将config2合并到config1产生的新对象
 */
module.exports = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {}
  var config = {}

  /**
   * 获得合并后的值
   * @param target 目标对象
   * @param source 源对象
   * @return {{}|*} 合并后的值
   */
  function getMergedValue(target, source) {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge(target, source)
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source)
    } else if (utils.isArray(source)) {
      return source.slice()
    }
    return source
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(prop) {
    //config2[prop]有值则以config2[prop]为准，否则以config1[prop]为准
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(config1[prop], config2[prop])
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop])
    }
  }

  // eslint-disable-next-line consistent-return
  /**
   * 从config2中取值
   * @param prop 属性
   * @return {{}|*}
   */
  function valueFromConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop])
    }
  }

  // eslint-disable-next-line consistent-return
  /**
   * 默认取config2的值，如果没有则取config1的值
   * @param prop 属性名
   * @return {{}|*} 属性值
   */
  function defaultToConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop])
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop])
    }
  }

  // eslint-disable-next-line consistent-return
  /**
   * 合并直接键（包含在原型链上的属性），以config2为主导
   * @param prop 属性名
   * @return {{}|*} 合并的属性值
   */
  function mergeDirectKeys(prop) {
    if (prop in config2) {
      return getMergedValue(config1[prop], config2[prop])
    } else if (prop in config1) {
      return getMergedValue(undefined, config1[prop])
    }
  }

  //指定各个值合并的方法
  var mergeMap = {
    'url': valueFromConfig2,
    'method': valueFromConfig2,
    'data': valueFromConfig2,
    'baseURL': defaultToConfig2,
    'transformRequest': defaultToConfig2,
    'transformResponse': defaultToConfig2,
    'paramsSerializer': defaultToConfig2,
    'timeout': defaultToConfig2,
    'timeoutMessage': defaultToConfig2,
    'withCredentials': defaultToConfig2,
    'adapter': defaultToConfig2,
    'responseType': defaultToConfig2,
    'xsrfCookieName': defaultToConfig2,
    'xsrfHeaderName': defaultToConfig2,
    'onUploadProgress': defaultToConfig2,
    'onDownloadProgress': defaultToConfig2,
    'decompress': defaultToConfig2,
    'maxContentLength': defaultToConfig2,
    'maxBodyLength': defaultToConfig2,
    'transport': defaultToConfig2,
    'httpAgent': defaultToConfig2,
    'httpsAgent': defaultToConfig2,
    'cancelToken': defaultToConfig2,
    'socketPath': defaultToConfig2,
    'responseEncoding': defaultToConfig2,
    'validateStatus': mergeDirectKeys
  }

  //遍历config1和config2的键
  utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
    //合并方法，默认是mergeDeepProperties
    var merge = mergeMap[prop] || mergeDeepProperties
    var configValue = merge(prop);
    (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue)
  })

  return config
}
