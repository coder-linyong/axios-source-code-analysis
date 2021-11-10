'use strict'

var bind = require('./helpers/bind')

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]'
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined'
}

/**
 * Determine if a value is a Buffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val)
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]'
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData)
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val)
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer)
  }
  return result
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string'
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number'
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object'
}

/**
 * 确定值是否为普通对象
 *
 * @param {Object} val 要测试的值
 * @return {boolean} 如果value是普通对象，则为True，否则为false
 */
function isPlainObject(val) {
  if (toString.call(val) !== '[object Object]') {
    return false
  }

  //判断原型，原型是null或者是Object的原型则是普通对象
  var prototype = Object.getPrototypeOf(val)
  return prototype === null || prototype === Object.prototype
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]'
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]'
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]'
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]'
}

/**
 * 确定值是否为流
 *
 * @param {Object} val 要测试的值
 * @returns {boolean} 如果value是流，则为True，否则为false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe)
}

/**
 * 确定值是否为URLSearchParams对象
 *
 * @param {Object} val 要测试的值
 * @returns {boolean} 如果value是URLSearchParams对象，则为True，否则为false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '')
}

/**
 * 确定我们是否在标准浏览器环境中运行
 *
 * 这允许axios在web worker中运行，并且react-native。
 * 两种环境都支持XMLHttpRequest，但不支持完全标准的全局变量。
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
    navigator.product === 'NativeScript' ||
    navigator.product === 'NS')) {
    return false
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  )
}

/**
 * 迭代数组或对象，为每个项目调用函数。
 *
 * 如果 'obj' 是一个数组，则将调用回调，传递每个项目的值，索引和完整数组。
 *
 * 如果 'obj' 是一个对象，则将调用回调，传递每个属性的值，键和完整对象。
 *
 * @param {Object|Array} obj 要迭代的对象
 * @param {Function} fn 每个项目要调用的回调
 */
function forEach(obj, fn) {
  // 如果是null和undefined，则直接返回
  if (obj === null || typeof obj === 'undefined') {
    return
  }

  // 不是对象则强制转换为数组
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj]
  }

  if (isArray(obj)) {
    // 迭代数组值
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj)
    }
  } else {
    // 遍历对象键
    for (var key in obj) {
      //for...in会遍历原型链中的可枚举属性，所以需要用hasOwnProperty来进行判断属性是否只属于对象本身
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj)
      }
    }
  }
}

/**
 * 接受varargs期望每个参数都是一个对象，然后不可变地合并每个对象的属性并返回结果。
 *
 * 当多个对象包含相同的键时，参数列表中的后面的对象将优先。
 *
 * 使用递归实现
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 要合并的对象
 * @returns {Object} 所有合并属性的结果
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {}

  //合并值
  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      //如果都是普通对象，则相合并
      result[key] = merge(result[key], val)
    } else if (isPlainObject(val)) {
      //val是普通对象，则将val拷贝一份
      result[key] = merge({}, val)
    } else if (isArray(val)) {
      //是数组则用slice方法浅拷贝一个数组
      result[key] = val.slice()
    } else {
      //是基础数据类型值直接赋值
      result[key] = val
    }
  }

  //遍历参数，将遍历项和之前的内容相合并
  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue)
  }
  return result
}

/**
 * 通过向对象a中添加对象b的属性来扩展对象a。
 *
 * @param {Object} a 要扩展的对象
 * @param {Object} b 要从中复制属性的对象
 * @param {Object} thisArg 要将函数绑定到的对象
 * @return {Object} 对象a的结果值
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      //如果val是函数，则绑定this为函数的this
      a[key] = bind(val, thisArg)
    } else {
      a[key] = val
    }
  })
  return a
}

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1)
  }
  return content
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM
}
