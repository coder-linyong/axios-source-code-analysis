'use strict'

var utils = require('./../utils')
var settle = require('./../core/settle')
var buildFullPath = require('../core/buildFullPath')
var buildURL = require('./../helpers/buildURL')
var http = require('http')
var https = require('https')
var httpFollow = require('follow-redirects').http
var httpsFollow = require('follow-redirects').https
var url = require('url')
var zlib = require('zlib')
var VERSION = require('./../env/data').version
var createError = require('../core/createError')
var enhanceError = require('../core/enhanceError')
var defaults = require('../defaults')
var Cancel = require('../cancel/Cancel')

var isHttps = /https:?/

/**
 * 设置代理（node环境下）
 * @param {http.ClientRequestArgs} options
 * @param {AxiosProxyConfig} proxy
 * @param {string} location
 */
function setProxy(options, proxy, location) {
  options.hostname = proxy.host
  options.host = proxy.host
  options.port = proxy.port
  options.path = location

  // 基本代理授权
  if (proxy.auth) {
    var base64 = Buffer.from(proxy.auth.username + ':' + proxy.auth.password, 'utf8').toString('base64')
    options.headers['Proxy-Authorization'] = 'Basic ' + base64
  }

  // 如果使用代理，则任何重定向也必须通过代理（重定向之前执行）
  options.beforeRedirect = function beforeRedirect(redirection) {
    redirection.headers.host = redirection.host
    setProxy(redirection, proxy, redirection.href)
  }
}

/*eslint consistent-return:0*/
module.exports = function httpAdapter(config) {
  return new Promise(function dispatchHttpRequest(resolvePromise, rejectPromise) {
    var onCanceled

    function done() {
      //取消消息订阅
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled)
      }

      //取消事件监听
      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled)
      }
    }

    var resolve = function resolve(value) {
      done()
      resolvePromise(value)
    }
    var reject = function reject(value) {
      done()
      rejectPromise(value)
    }
    var data = config.data
    var headers = config.headers
    var headerNames = {}

    //设置headers键的小写映射
    Object.keys(headers).forEach(function storeLowerName(name) {
      headerNames[name.toLowerCase()] = name
    })

    // 设置用户代理 (某些服务器需要)
    // See https://github.com/axios/axios/issues/69
    if ('user-agent' in headerNames) {
      // 指定了用户代理; 处理不需要UA标头的情况
      if (!headers[headerNames['user-agent']]) {
        delete headers[headerNames['user-agent']]
      }
      // 否则，使用指定值
    } else {
      // 仅在配置中未设置标头时才设置标头
      headers['User-Agent'] = 'axios/' + VERSION
    }

    //当data不是流时处理
    if (data && !utils.isStream(data)) {
      if (Buffer.isBuffer(data)) {
        // 是Buffer则什么都不做
      } else if (utils.isArrayBuffer(data)) {
        // 是ArrayBuffer时则转换为Buffer
        data = Buffer.from(new Uint8Array(data))
      } else if (utils.isString(data)) {
        // 是string时则使用utf-8编码格式转换为Buffer
        data = Buffer.from(data, 'utf-8')
      } else {
        return reject(createError(
          'Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream',
          config
        ))
      }

      // 如果存在数据，请添加Content-Length标头
      if (!headerNames['content-length']) {
        headers['Content-Length'] = data.length
      }
    }

    // HTTP基本身份验证
    var auth = undefined
    if (config.auth) {
      var username = config.auth.username || ''
      var password = config.auth.password || ''
      auth = username + ':' + password
    }

    // 解析url
    var fullPath = buildFullPath(config.baseURL, config.url)
    var parsed = url.parse(fullPath)
    var protocol = parsed.protocol || 'http:'

    //配置中没有auth，url中有auth
    if (!auth && parsed.auth) {
      var urlAuth = parsed.auth.split(':')
      var urlUsername = urlAuth[0] || ''
      var urlPassword = urlAuth[1] || ''
      auth = urlUsername + ':' + urlPassword
    }

    //同时有auth和authorization时，删除authorization
    if (auth && headerNames.authorization) {
      delete headers[headerNames.authorization]
    }

    var isHttpsRequest = isHttps.test(protocol)
    var agent = isHttpsRequest ? config.httpsAgent : config.httpAgent

    var options = {
      path: buildURL(parsed.path, config.params, config.paramsSerializer).replace(/^\?/, ''),
      method: config.method.toUpperCase(),
      headers: headers,
      agent: agent,
      agents: {http: config.httpAgent, https: config.httpsAgent},
      auth: auth
    }

    if (config.socketPath) {
      options.socketPath = config.socketPath
    } else {
      options.hostname = parsed.hostname
      options.port = parsed.port
    }

    var proxy = config.proxy
    if (!proxy && proxy !== false) {
      var proxyEnv = protocol.slice(0, -1) + '_proxy'
      var proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()]
      if (proxyUrl) {
        var parsedProxyUrl = url.parse(proxyUrl)
        var noProxyEnv = process.env.no_proxy || process.env.NO_PROXY
        var shouldProxy = true

        if (noProxyEnv) {
          var noProxy = noProxyEnv.split(',').map(function trim(s) {
            return s.trim()
          })

          shouldProxy = !noProxy.some(function proxyMatch(proxyElement) {
            if (!proxyElement) {
              return false
            }
            if (proxyElement === '*') {
              return true
            }
            if (proxyElement[0] === '.' &&
              parsed.hostname.substr(parsed.hostname.length - proxyElement.length) === proxyElement) {
              return true
            }

            return parsed.hostname === proxyElement
          })
        }

        if (shouldProxy) {
          proxy = {
            host: parsedProxyUrl.hostname,
            port: parsedProxyUrl.port,
            protocol: parsedProxyUrl.protocol
          }

          if (parsedProxyUrl.auth) {
            var proxyUrlAuth = parsedProxyUrl.auth.split(':')
            proxy.auth = {
              username: proxyUrlAuth[0],
              password: proxyUrlAuth[1]
            }
          }
        }
      }
    }

    if (proxy) {
      options.headers.host = parsed.hostname + (parsed.port ? ':' + parsed.port : '')
      setProxy(options, proxy, protocol + '//' + parsed.hostname + (parsed.port ? ':' + parsed.port : '') + options.path)
    }

    var transport
    var isHttpsProxy = isHttpsRequest && (proxy ? isHttps.test(proxy.protocol) : true)
    if (config.transport) {
      transport = config.transport
    } else if (config.maxRedirects === 0) {
      transport = isHttpsProxy ? https : http
    } else {
      if (config.maxRedirects) {
        options.maxRedirects = config.maxRedirects
      }
      transport = isHttpsProxy ? httpsFollow : httpFollow
    }

    if (config.maxBodyLength > -1) {
      options.maxBodyLength = config.maxBodyLength
    }

    if (config.insecureHTTPParser) {
      options.insecureHTTPParser = config.insecureHTTPParser
    }

    // 创建请求
    var req = transport.request(options, function handleResponse(res) {
      if (req.aborted) return

      // 如果需要，透明地解压缩响应体
      var stream = res

      // return the last request in case of redirects
      var lastRequest = res.req || req


      // if no content, is HEAD request or decompress disabled we should not decompress
      if (res.statusCode !== 204 && lastRequest.method !== 'HEAD' && config.decompress !== false) {
        switch (res.headers['content-encoding']) {
          /*eslint default-case:0*/
          case 'gzip':
          case 'compress':
          case 'deflate':
            // add the unzipper to the body stream processing pipeline
            stream = stream.pipe(zlib.createUnzip())

            // remove the content-encoding in order to not confuse downstream operations
            delete res.headers['content-encoding']
            break
        }
      }

      var response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: res.headers,
        config: config,
        request: lastRequest
      }

      if (config.responseType === 'stream') {
        response.data = stream
        settle(resolve, reject, response)
      } else {
        var responseBuffer = []
        var totalResponseBytes = 0
        stream.on('data', function handleStreamData(chunk) {
          responseBuffer.push(chunk)
          totalResponseBytes += chunk.length

          // make sure the content length is not over the maxContentLength if specified
          if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
            stream.destroy()
            reject(createError('maxContentLength size of ' + config.maxContentLength + ' exceeded',
              config, null, lastRequest))
          }
        })

        stream.on('error', function handleStreamError(err) {
          if (req.aborted) return
          reject(enhanceError(err, config, null, lastRequest))
        })

        stream.on('end', function handleStreamEnd() {
          var responseData = Buffer.concat(responseBuffer)
          if (config.responseType !== 'arraybuffer') {
            responseData = responseData.toString(config.responseEncoding)
            if (!config.responseEncoding || config.responseEncoding === 'utf8') {
              responseData = utils.stripBOM(responseData)
            }
          }

          response.data = responseData
          settle(resolve, reject, response)
        })
      }
    })

    // Handle errors
    req.on('error', function handleRequestError(err) {
      if (req.aborted && err.code !== 'ERR_FR_TOO_MANY_REDIRECTS') return
      reject(enhanceError(err, config, null, req))
    })

    // Handle request timeout
    if (config.timeout) {
      // This is forcing a int timeout to avoid problems if the `req` interface doesn't handle other types.
      var timeout = parseInt(config.timeout, 10)

      if (isNaN(timeout)) {
        reject(createError(
          'error trying to parse `config.timeout` to int',
          config,
          'ERR_PARSE_TIMEOUT',
          req
        ))

        return
      }

      // Sometime, the response will be very slow, and does not respond, the connect event will be block by event loop system.
      // And timer callback will be fired, and abort() will be invoked before connection, then get "socket hang up" and code ECONNRESET.
      // At this time, if we have a large number of request, nodejs will hang up some socket on background. and the number will up and up.
      // And then these socket which be hang up will devoring CPU little by little.
      // ClientRequest.setTimeout will be fired on the specify milliseconds, and can make sure that abort() will be fired after connect.
      req.setTimeout(timeout, function handleRequestTimeout() {
        req.abort()
        var transitional = config.transitional || defaults.transitional
        reject(createError(
          'timeout of ' + timeout + 'ms exceeded',
          config,
          transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
          req
        ))
      })
    }

    if (config.cancelToken || config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = function (cancel) {
        if (req.aborted) return

        req.abort()
        reject(!cancel || (cancel && cancel.type) ? new Cancel('canceled') : cancel)
      }

      config.cancelToken && config.cancelToken.subscribe(onCanceled)
      if (config.signal) {
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled)
      }
    }


    // Send the request
    if (utils.isStream(data)) {
      data.on('error', function handleStreamError(err) {
        reject(enhanceError(err, config, null, req))
      }).pipe(req)
    } else {
      req.end(data)
    }
  })
}
