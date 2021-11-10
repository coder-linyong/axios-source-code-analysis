'use strict'

var utils = require('./../utils')

// 节点忽略其重复项的标头
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
]

/**
 * 将标头解析为对象
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers H需要解析的eaders
 * @returns {Object} 解析为对象的标题
 */
module.exports = function parseHeaders (headers) {
  var parsed = {}
  var key
  var val
  var i

  if (!headers) {
    return parsed
  }

  //根据\n截断传入的headers成数组，然后遍历数组
  utils.forEach(headers.split('\n'), function parser (line) {
    //根据':'截取左右两侧的键和值
    i = line.indexOf(':')
    key = utils.trim(line.substr(0, i)).toLowerCase()
    val = utils.trim(line.substr(i + 1))

    if (key) {
      //需要忽略重复项的
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return
      }
      if (key === 'set-cookie') {
        //set-cookie重复值存入数组中
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val])
      } else {
        //用','拼接成字符串
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val
      }
    }
  })

  return parsed
}
