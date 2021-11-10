'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var Cancel = require('../cancel/Cancel');

/**
 * 如果要取消请求，则抛出 “Cancel”。
 */
function throwIfCancellationRequested(config) {
  // 如果配置有cancelToke，则调用cancelToken.throwIfRequested()
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new Cancel('canceled');
  }
}

/**
 * 使用配置的适配器将请求分派到服务器。
 *
 * @param {object} config 用于请求的配置
 * @returns {Promise} 要兑现的期约
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // 确保headers存在
  config.headers = config.headers || {};

  // 转换请求数据
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // 铺平headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  // 上面将headers合并为一个headers对象，所以不需要所有请求方式的headers配置了
  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  // 适配器
  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // 转换响应数据
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // 转换响应数据
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};
