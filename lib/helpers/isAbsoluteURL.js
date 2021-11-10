'use strict'

/**
 * 确定指定的URL是否为绝对URL
 *
 * @param {string} url 要测试的URL
 * @returns {boolean} 如果指定的URL是绝对的，则为True，否则为false
 */
module.exports = function isAbsoluteURL(url) {
  // 如果URL以 “<scheme>:” 或 “” (协议相对URL) 开头，则该URL被认为是绝对的。
  // RFC3986将方案名称定义为以字母开头并跟随的字符序列
  // 通过字母、数字、加号、句号或连字符的任意组合。
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url)
}
