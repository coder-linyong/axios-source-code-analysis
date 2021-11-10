'use strict';

var enhanceError = require('./enhanceError');

/**
 * 使用指定的消息，配置，错误代码，请求和响应创建错误。
 *
 * @param {string} message 错误消息
 * @param {Object} config 配置
 * @param {string} [code] 错误代码 (例如，'ECONNABORTED')
 * @param {Object} [request] 请求
 * @param {Object} [response] 响应
 * @returns {Error} 创建的错误。
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};
