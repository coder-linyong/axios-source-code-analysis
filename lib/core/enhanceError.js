'use strict'

/**
 * 使用指定的配置、错误代码和响应更新错误。
 *
 * @param {Error} error 要更新的错误。
 * @param {Object} config 配置。
 * @param {string} [code] 错误代码 (例如，'ECONNABORTED')。
 * @param {Object} [request] 请求
 * @param {Object} [response] 响应
 * @returns {Error} 错误
 */
module.exports = function enhanceError(error, config, code, request, response) {
  //将数据设置到错误对象上
  error.config = config
  if (code) {
    error.code = code
  }

  error.request = request
  error.response = response
  error.isAxiosError = true

  error.toJSON = function toJSON() {
    //做出各种兼容性的输出
    return {
      // 标准
      message: this.message,
      name: this.name,
      // 微软
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    }
  }
  return error
}
