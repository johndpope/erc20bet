import { toBN } from '../../helpers/contract-helper'
import expect from '../../helpers/expect-using-bn'

const CoinToken = artifacts.require('CoinToken')

const toAmount = n => toBN(n).mul(toBN(10).pow(toBN(18)))

contract('CoinToken', ([tokenCreator, randomAccount]) => {
  before(async function() {
    this.token = await CoinToken.new({ from: tokenCreator })
  })
  it('should have 21,000,000 total supply', async function() {
    expect(await this.token.totalSupply()).to.eq.BN(toBN(toAmount(21 * 10 ** 6)))
  })
  it('the token creator should own the complete coin supply', async function() {
    expect(await this.token.balanceOf(tokenCreator)).to.eq.BN(toAmount(21 * 10 ** 6))
  })
  it('a random account should have 0 tokens', async function() {
    expect(await this.token.balanceOf(randomAccount)).to.eq.BN(0)
  })
})
