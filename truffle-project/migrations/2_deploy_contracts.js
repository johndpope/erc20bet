const Erc20BetExchange = artifacts.require('./Erc20BetExchange.sol')

const OraclizeRng = artifacts.require('./rng/OraclizeRng.sol')
const TrustedRng = artifacts.require('./rng/TrustedRng.sol')

const BeerToken = artifacts.require('./tokens/BeerToken.sol')
const CoinToken = artifacts.require('./tokens/CoinToken.sol')

module.exports = async (deployer, network, accounts) => {
  const rng = network === 'development' ? TrustedRng : OraclizeRng
  // await Promise.all([MerkleTree, rng, BeerToken, CoinToken].map(c => deployer.deploy(c)))
  // await deployer.link(MerkleTree, [ERC20BetExchange, MerkleTreeMock, MerkleTreeTest])
  // await Promise.all(
  //   [[ERC20BetExchange, rng.address], [MerkleTreeMock], [MerkleTreeTest]].map(c =>
  //     deployer.deploy(...c)
  //   )
  // )

  await Promise.all([rng, BeerToken, CoinToken].map(c => deployer.deploy(c)))
  await deployer.deploy(Erc20BetExchange, rng.address)
}
