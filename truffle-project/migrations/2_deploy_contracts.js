const Exchange = artifacts.require('Exchange')

// const OraclizeRng = artifacts.require('./rng/OraclizeRng.sol')
const TrustedRNGFactory = artifacts.require('TrustedRNGFactory')

const WrappedETHToken = artifacts.require('WrappedETHToken')
const BeerToken = artifacts.require('BeerToken')
const CoinToken = artifacts.require('CoinToken')

module.exports = async (deployer, network, accounts) => {
  // const rng = network === 'development' ? TrustedRng : OraclizeRng
  const rngFactory = TrustedRNGFactory
  await Promise.all(
    [rngFactory, WrappedETHToken, BeerToken, CoinToken].map(c => deployer.deploy(c))
  )
  // await deployer.deploy(Exchange, rngFactory.address, WrappedETHToken.address)
}
