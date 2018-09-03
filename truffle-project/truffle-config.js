require('babel-register')
require('babel-polyfill')

// require('babel-register')({
//   ignore: /node_modules/
// })
// require('babel-polyfill')

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // eslint-disable-line camelcase

      // For testing, copied from
      // https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/truffle-config.js
      gas: 0xfffffffffff,
      gasPrice: 0x01
    }
  },
  // See http://solidity.readthedocs.io/en/develop/using-the-compiler.html#compiler-input-and-output-json-description
  optimizer: {
    // // disabled by default
    // enabled: true,
    // // Optimize for how many times you intend to run the code.
    // // Lower values will optimize more for initial deployment cost, higher values will optimize more for high-frequency usage.
    // runs: 1000000
  }
}
