const rewireMobX = require('react-app-rewire-mobx')

module.exports = function override(config, env) {
  return rewireMobX(config, env)
}
