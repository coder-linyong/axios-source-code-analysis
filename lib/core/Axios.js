'use strict'

var utils = require('./../utils')
var buildURL = require('../helpers/buildURL')
var InterceptorManager = require('./InterceptorManager')
var dispatchRequest = require('./dispatchRequest')
var mergeConfig = require('./mergeConfig')
var validator = require('../helpers/validator')

var validators = validator.validators

/**
 * 创建Axios的新实例
 *
 * @param {Object} instanceConfig 实例的默认配置
 */
function Axios(instanceConfig) {
  //设置默认参数
  this.defaults = instanceConfig
  //配置请求、响应拦截
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  }
}

/**
 * 发送请求（核心方法）
 *
 * @param {Object} config 特定于此请求的配置 (与this.defaults合并)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  if (typeof config === 'string') {
    // 允许如axios('example/url' [，config])那样发送请求
    config = arguments[1] || {}
    config.url = arguments[0]
  } else {
    //或者像axios({url:'example/url',...otherConfig})那样发送请求
    config = config || {}
  }

  config = mergeConfig(this.defaults, config)

  // 设置config.method（转换成小写），默认get
  // 因为会转换成小写，所以请求方式大小写并不敏感
  if (config.method) {
    config.method = config.method.toLowerCase()
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase()
  } else {
    config.method = 'get'
  }

  var transitional = config.transitional

  //如果有过渡选项
  if (transitional !== undefined) {
    //判断config.transitional的值是不是都是boolean类型
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false)
  }

  // 过滤掉跳过的请求拦截器
  var requestInterceptorChain = []
  var synchronousRequestInterceptors = true
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return
    }

    //只有全都是同步请求，才是true
    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous

    //越先添加的拦截器越后执行
    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected)
  })

  var responseInterceptorChain = []
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected)
  })

  var promise

  if (!synchronousRequestInterceptors) {
    //添加undefined是因为后面遍历时是两个两个一起的
    var chain = [dispatchRequest, undefined]

    //将请求拦截链添加到chain前面，达到的效果是先执行请求拦截再分发请求
    Array.prototype.unshift.apply(chain, requestInterceptorChain)
    //将响应拦截链连接到chain上，最终效果是分发请求响应后依次执行响应拦截
    /*
      最终结果类似如下结构
      [
        '请求拦截成功函数2','请求拦截失败函数2',
        '请求拦截成功函数1','请求拦截失败函数1',
        '分发请求函数',undefined,
        '响应拦截成功函数1','响应拦截失败函数1',
        '响应拦截成功函数2','响应拦截失败函数2',
      ]
     */
    chain = chain.concat(responseInterceptorChain)

    //生成解决结果为config的期约实例，开始期约链
    promise = Promise.resolve(config)
    while (chain.length) {
      //请求拦截器、分发请求、响应拦截串联成Promise的链式调用，当期约被解决/拒绝时调用
      promise = promise.then(chain.shift(), chain.shift())
    }
    /*
      最终期约链如下：
      const promise = Promise.resolve(config)
      promise.then('请求拦截成功函数2','请求拦截失败函数2')
      .then('请求拦截成功函数1','请求拦截失败函数1')
      .then(dispatchRequest, undefined)
      .then('响应拦截成功函数1','响应拦截失败函数1')
      .then('响应拦截成功函数2','响应拦截失败函数2')
      .then('用户写的业务处理函数')
      .catch('用户写的报错业务处理函数')
     */

    return promise
  }

  var newConfig = config
  //同步请求的话依次执行请求拦截器，并从拦截器链中移除
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift()
    var onRejected = requestInterceptorChain.shift()
    try {
      newConfig = onFulfilled(newConfig)
    } catch (error) {
      onRejected(error)
      break
    }
  }

  //而后分发请求
  try {
    promise = dispatchRequest(newConfig)
  } catch (error) {
    return Promise.reject(error)
  }

  //最后依次执行响应拦截器并从拦截器链中移除
  while (responseInterceptorChain.length) {
    //请求拦截器、分发请求、响应拦截串联成Promise的链式调用
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift())
  }

  return promise
}

Axios.prototype.getUri = function getUri(config) {
  //合并配置
  config = mergeConfig(this.defaults, config)
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '')
}

// 为支持的请求方法提供别名，使我们可以使用axios.get()的方式请求接口
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function (url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }))
  }
})

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function (url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: data
    }))
  }
})

module.exports = Axios
