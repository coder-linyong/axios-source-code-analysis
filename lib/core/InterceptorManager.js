'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * 将新的拦截器添加到堆栈中
 *
 * @param {Function} fulfilled 用于处理`then`返回的`Promise`的函数
 * @param {Function} rejected 用于处理``reject`返回的`Promise`的函数
 *
 * @return {Number} 用于稍后删除拦截器的ID
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};

/**
 * 从堆栈中删除拦截器
 *
 * @param {Number} id “使用” 返回的ID
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * 迭代所有已注册的拦截器
 *
 * 此方法对于跳过可能调用'eject'已成为 'null' 的任何拦截器特别有用。
 *
 * @param {Function} fn 每个拦截器要调用的函数
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  // 调用utils上的forEach函数，然后在调用传入的fn函数
  utils.forEach(this.handlers, function forEachHandler(h) {
    // 跳过是null的拦截器
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;
