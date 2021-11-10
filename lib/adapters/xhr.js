'use strict'

var utils = require('./../utils')
var settle = require('./../core/settle')
var cookies = require('./../helpers/cookies')
var buildURL = require('./../helpers/buildURL')
var buildFullPath = require('../core/buildFullPath')
var parseHeaders = require('./../helpers/parseHeaders')
var isURLSameOrigin = require('./../helpers/isURLSameOrigin')
var createError = require('../core/createError')
var defaults = require('../defaults')
var Cancel = require('../cancel/Cancel')

module.exports = function xhrAdapter (config) {
  return new Promise(function dispatchXhrRequest (resolve, reject) {
    var requestData = config.data
    var requestHeaders = config.headers
    var responseType = config.responseType
    var onCanceled

    //完成时调用的函数，用于取消相关事件监听
    function done () {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled)
      }

      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled)
      }
    }

    //如果请求数据是FormData，则删除Content-Type，让浏览器设置Content-Type
    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type'] // 让浏览器设置
    }

    var request = new XMLHttpRequest()

    // HTTP基本身份验证
    if (config.auth) {
      var username = config.auth.username || ''
      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : ''
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password)
    }

    //真实路径是设置的baseURL+请求的url
    var fullPath = buildFullPath(config.baseURL, config.url)
    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true)

    // 在MS中设置请求超时
    request.timeout = config.timeout

    function onloadend () {
      if (!request) {
        return
      }
      // 准备响应
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null
      //取得响应数据
      var responseData = !responseType || responseType === 'text' || responseType === 'json' ?
        request.responseText : request.response
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      }

      //根据状态做出相应的动作（解决/拒绝期约）并清除事件监听和消息订阅
      settle(function _resolve (value) {
        resolve(value)
        done()
      }, function _reject (err) {
        reject(err)
        done()
      }, response)

      // 清理请求
      request = null
    }

    if ('onloadend' in request) {
      // 如果可用，则使用onloadend
      request.onloadend = onloadend
    } else {
      // loadend事件不可用，则监听就绪状态以模拟onloadend
      request.onreadystatechange = function handleLoad () {
        if (!request || request.readyState !== 4) {
          return
        }

        // 请求出错了，我们没有得到回应，
        // 这将由onerror来处理，但有一个例外: 请求使用file: protocol，大多数浏览器将返回状态为0，即使这是一个成功的请求
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return
        }
        // readystate处理程序在onerror或ontimeout处理程序之前调用，因此我们应该在下一个 'tick' 上调用onloadend
        setTimeout(onloadend)
      }
    }

    // 处理浏览器请求取消 (与手动取消相对)
    request.onabort = function handleAbort () {
      if (!request) {
        return
      }

      reject(createError('Request aborted', config, 'ECONNABORTED', request))

      // 清理请求
      request = null
    }

    // 处理低级网络错误
    request.onerror = function handleError () {
      // 浏览器对我们隐藏了真正的错误，onerror应该只在网络错误时触发
      reject(createError('Network Error', config, null, request))

      // 清理请求
      request = null
    }

    // 处理超时
    request.ontimeout = function handleTimeout () {
      var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded'
      var transitional = config.transitional || defaults.transitional
      //如果有配置超时信息则使用配置的
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage
      }
      reject(createError(
        timeoutErrorMessage,
        config,
        transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
        request))

      // 清理请求
      request = null
    }

    // 添加xsrf标题（XSRF防御）
    // 只有在标准浏览器环境中运行时，才会这样做。
    // 特别是如果我们在一个网络工作者，或者反应原生。
    if (utils.isStandardBrowserEnv()) {
      // 添加xsrf标题
      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue
      }
    }

    // 将headers添加到请求中
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader (val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // 如果没有data选项，则删除content-type
          delete requestHeaders[key]
        } else {
          // 否则将标头添加到请求中
          request.setRequestHeader(key, val)
        }
      })
    }

    // 如果需要，添加凭据给请求
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials
    }

    // 有配置响应类型并且不是json，则添加到请求中
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType
    }

    // 设置了onDownloadProgress函数则添加progress事件
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress)
    }

    // 并非所有浏览器都支持上传事件
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress)
    }

    //如果配置上有cancelToken或者signal属性就代表着可能要被取消
    if (config.cancelToken || config.signal) {
      // 处理取消
      // eslint-disable-next-line func-names
      onCanceled = function (cancel) {
        if (!request) {
          return
        }
        reject(!cancel || (cancel && cancel.type) ? new Cancel('canceled') : cancel)
        request.abort()
        request = null
      }

      config.cancelToken && config.cancelToken.subscribe(onCanceled)
      if (config.signal) {
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled)
      }
    }

    if (!requestData) {
      requestData = null
    }

    // 发送请求
    request.send(requestData)
  })
}
