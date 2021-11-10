'use strict'

var createError = require('./createError')

/**
 * 根据响应状态解决或拒绝承诺。
 *
 * @param {Function} resolve 解析承诺的函数。
 * @param {Function} reject 拒绝承诺的函数。
 * @param {object} response 响应
 */
module.exports = function settle(resolve, reject, response) {
  //验证状态方法
  var validateStatus = response.config.validateStatus
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response)
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ))
  }
}
