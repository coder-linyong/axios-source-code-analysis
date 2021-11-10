'use strict'

//导入工具
var utils = require('./../utils')
//导入默认对象（如果没有this，则axios的配置默认是这个）
var defaults = require('./../defaults')

/**
 * 转换请求或响应的数据
 *
 * @param {Object|String} data 要转换的数据
 * @param {Array} headers 请求或响应的标头
 * @param {Array|Function} fns 单个函数或函数数组
 * @returns {*} 生成的转换数据
 */
module.exports = function transformData(data, headers, fns) {
  var context = this || defaults
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    //遍历转换函数数组，然后调用他们（所以转换函数会依次调用，结果以最后调用函数为准）
    data = fn.call(context, data, headers)
  })

  return data
}
