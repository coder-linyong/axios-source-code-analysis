'use strict';

var Cancel = require('./Cancel');

/**
 * “Canceltoken” 是可用于请求取消操作的对象。
 *
 * @class
 * @param {Function} executor 执行器功能。
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;

  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;

  // eslint-disable-next-line func-names
  // 添加默认解决函数
  this.promise.then(function(cancel) {
    if (!token._listeners) return;

    var i;
    var l = token._listeners.length;

    for (i = 0; i < l; i++) {
      // 依次执行监听器
      token._listeners[i](cancel);
    }
    // 清空监听器
    token._listeners = null;
  });

  // eslint-disable-next-line func-names
  // 重写then方法，用于自行添加期约解决后的回调，代码执行时会先调用重写的then，然后调用原生的then
  /*
    可使用如下面方式添加解决函数：
    const source = axios.CancelToken.source()
    source.token.promise.then(() => {
      console.log('自定义的解决函数')
    })
   */
  this.promise.then = function(onfulfilled) {
    var _resolve;
    // eslint-disable-next-line func-names
    var promise = new Promise(function(resolve) {
      token.subscribe(resolve);
      _resolve = resolve;
    }).then(onfulfilled);

    promise.cancel = function reject() {
      token.unsubscribe(_resolve);
    };

    return promise;
  };

  // 执行器传入的匿名参数会在CancelToken.source().cancel()调用时执行
  executor(function cancel(message) {
    if (token.reason) {
      // 已经要求取消
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * 如果要求取消，则抛出 “Cancel”。
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  // 如果已经取消，则抛出取消原因
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * 订阅取消信号
 */
CancelToken.prototype.subscribe = function subscribe(listener) {
  // 如果已经取消，则直接执行
  if (this.reason) {
    listener(this.reason);
    return;
  }

  // 添加监听器到队列中
  if (this._listeners) {
    this._listeners.push(listener);
  } else {
    this._listeners = [listener];
  }
};

/**
 * 取消订阅取消信号
 */
CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
  if (!this._listeners) {
    return;
  }
  var index = this._listeners.indexOf(listener);
  if (index !== -1) {
    this._listeners.splice(index, 1);
  }
};

/**
 * 返回一个对象，该对象包含一个新的 'CancelToken' 和一个函数，该函数在调用时会取消 'CancelToken'。
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;
