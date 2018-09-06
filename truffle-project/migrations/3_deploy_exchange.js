const Exchange = artifacts.require('Exchange')

const TrustedRNGFactory = artifacts.require('TrustedRNGFactory')
const WrappedETHToken = artifacts.require('WrappedETHToken')

module.exports = async deployer => {
  await deployer.deploy(Exchange, TrustedRNGFactory.address, WrappedETHToken.address)
}
