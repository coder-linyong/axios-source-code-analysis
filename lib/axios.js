'use strict'
//工具类
var utils = require('./utils')
//bind方法
var bind = require('./helpers/bind')
//Axios构造函数
var Axios = require('./core/Axios')
//配置合并函数
var mergeConfig = require('./core/mergeConfig')
//默认配置
var defaults = require('./defaults')

/**
 * 创建Axios实例
 *
 * @param {Object} defaultConfig 实例的默认配置
 * @return {Axios} Axios的一个新实例
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig)
  // 返回一个包裹函数，这个函数将Axios.prototype.request的this绑定为Axios的实例
  // 后续每次调用axios其实是调用Axios.prototype.request方法
  var instance = bind(Axios.prototype.request, context)

  // 复制axios.prototype到instance并指定this为刚创建的Axios实例
  // 所以axios具有Axios.prototype的方法和属性
  utils.extend(instance, Axios.prototype, context)

  // 将context复制到instance
  utils.extend(instance, context)

  // 用于创建新实例的工厂函数（工厂模式）
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig))
  }

  return instance
}

// 创建要导出的默认实例
var axios = createInstance(defaults)

// 公开Axios类以允许类继承
axios.Axios = Axios

// 暴露Cancel和CancelToken等
axios.Cancel = require('./cancel/Cancel')
axios.CancelToken = require('./cancel/CancelToken')
axios.isCancel = require('./cancel/isCancel')
axios.VERSION = require('./env/data').version

// 暴露all和spread方法
axios.all = function all(promises) {
  //axios.all其实就是Promise.all
  return Promise.all(promises)
}
axios.spread = require('./helpers/spread')

// 暴露isAxiosError
axios.isAxiosError = require('./helpers/isAxiosError')

module.exports = axios

// 允许在TypeScript中使用默认导入语法
// import axios from 'axios'
module.exports.default = axios
