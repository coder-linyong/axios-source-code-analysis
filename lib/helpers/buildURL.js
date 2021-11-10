'use strict'

var utils = require('./../utils')

function encode(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ':').replace(/%24/g, '$').replace(/%2C/gi, ',').replace(/%20/g, '+').replace(/%5B/gi, '[').replace(/%5D/gi, ']')
}

/**
 * 通过将params附加到末尾来构建URL
 *
 * @param {string} url 根url (e.g., http://www.google.com)
 * @param {object} [params] 要附加的参数
 * @returns {string} 格式化的url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url
  }

  var serializedParams
  if (paramsSerializer) {
    //传递有序列化函数，直接调用该函数序列化
    serializedParams = paramsSerializer(params)
  } else if (utils.isURLSearchParams(params)) {
    //是URLSearchParams对象直接转换成字符串
    //URLSearchParams：https://developer.mozilla.org/zh-CN/docs/Web/API/URLSearchParams
    serializedParams = params.toString()
  } else {
    var parts = []

    utils.forEach(params, function serialize(val, key) {
      //无效值直接退出这次遍历
      if (val === null || typeof val === 'undefined') {
        return
      }

      if (utils.isArray(val)) {
        //处理数组的key
        key = key + '[]'
      } else {
        // 不是数组则转换成数组
        val = [val]
      }

      //遍历值数组，并将其转换成字符串
      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          //日期转换成ISO字符串形式
          v = v.toISOString()
        } else if (utils.isObject(v)) {
          //对象转换成JSON形式
          v = JSON.stringify(v)
        }
        //键值对用“=”拼接，然后追加到数组上
        parts.push(encode(key) + '=' + encode(v))
      })
    })

    //最后将数组项用&拼接
    serializedParams = parts.join('&')
  }

  if (serializedParams) {
    //处理具有哈希值的url
    var hashmarkIndex = url.indexOf('#')
    if (hashmarkIndex !== -1) {
      //只截取“#”前面部分
      url = url.slice(0, hashmarkIndex)
    }

    //判断有没有“?”，有则使用"?"链接，否则用“&”连接
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams
  }

  return url
}
