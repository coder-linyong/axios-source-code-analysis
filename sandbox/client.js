var axios = require('../index.js')
const {Axios} = require('../index')

axios.interceptors.request.use(function (config) {
  return config
}, function (error) {
  return Promise.reject(error)
})

axios.interceptors.response.use(function (response) {
  return response
}, function (error) {
  return Promise.reject(error)
})

axios('http://159.75.82.123:5823/api/v1/SiteStatistics', {
  params: {
    type: 1
  }
})
  .then(console.log)
  .catch(console.log)
