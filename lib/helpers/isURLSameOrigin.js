'use strict'

var utils = require('./../utils')

module.exports = (
  utils.isStandardBrowserEnv() ?

    // 标准浏览器env完全支持测试请求URL是否与当前位置相同来源所需的api。
    (function standardBrowserEnv () {
      var msie = /(msie|trident)/i.test(navigator.userAgent)
      var urlParsingNode = document.createElement('a')
      var originURL

      /**
       * 解析URL以发现其组件
       *
       * @param {String} url 要解析的URL
       * @returns {Object}
       */
      function resolveURL (url) {
        var href = url

        if (msie) {
          // IE需要属性设置两次以归一化属性
          urlParsingNode.setAttribute('href', href)
          href = urlParsingNode.href
        }

        urlParsingNode.setAttribute('href', href)

        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
            urlParsingNode.pathname :
            '/' + urlParsingNode.pathname
        }
      }

      originURL = resolveURL(window.location.href)

      /**
       * 确定URL是否与当前位置共享相同的原点
       *
       * @param {String} requestURL 要测试的URL
       * @returns {boolean} 如果URL共享相同的来源，则为True，否则为false
       */
      return function isURLSameOrigin (requestURL) {
        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL
        return (parsed.protocol === originURL.protocol &&
          parsed.host === originURL.host)
      }
    })() :

    // 非标准浏览器envs (网络工作者，反应原生) 缺乏所需的支持。
    (function nonStandardBrowserEnv () {
      return function isURLSameOrigin () {
        return true
      }
    })()
)
