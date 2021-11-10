'use strict'

var utils = require('../utils')

/**
 * 正常化头部名称
 * @param headers 头部
 * @param normalizedName 正常化名称
 */
module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    //名字大小写不一样时采取传入的名称
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      //设置传入名称的值并删除不正常的那个
      headers[normalizedName] = value
      delete headers[name]
    }
  })
}
