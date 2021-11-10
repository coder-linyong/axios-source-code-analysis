'use strict';

/**
 * 通过组合指定的URL创建新的URL
 *
 * @param {string} baseURL 基本网址
 * @param {string} relativeURL 相对URL
 * @returns {string} 组合URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};
