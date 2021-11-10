'use strict'

var isAbsoluteURL = require('../helpers/isAbsoluteURL')
var combineURLs = require('../helpers/combineURLs')

/**
 * 通过将baseURL与requesteturl组合来创建新的URL，仅当requestedURL还不是绝对URL时。
 * 如果requestURL是绝对的，则此函数返回未触及的requestedURL。
 *
 * @param {string} baseURL 基本网址
 * @param {string} requestedURL 要合并的绝对或相对URL
 * @returns {string} 组合完整路径
 */
module.exports = function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    //返回组合的URL
    return combineURLs(baseURL, requestedURL)
  }
  return requestedURL
}
