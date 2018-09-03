import expect from '../../helpers/expect-using-bn'
import { expectRevert } from '../../helpers/tests'

const BeerToken = artifacts.require('BeerToken')

contract('BeerToken', ([creator, fisrtAccount, secondAccount]) => {
  before(async function() {
    this.token = await BeerToken.new({ from: creator })
  })
  it('should initially have 0 total supply', async function() {
    expect(await this.token.totalSupply()).to.eq.BN(0)
  })
  it('the token creator should have 0 balance', async function() {
    expect(await this.token.balanceOf(creator)).to.eq.BN(0)
  })
  it('an account should initally have 0 tokens', async function() {
    expect(await this.token.balanceOf(fisrtAccount)).to.eq.BN(0)
  })
  it('the same account should have 10 tokens after sending its 1st 0-ether transaction', async function() {
    await this.token.sendTransaction({ from: fisrtAccount })
    expect(await this.token.balanceOf(fisrtAccount)).to.eq.BN(10)
  })
  it('the same account should have 20 tokens after sending its 2nd 0-ether transaction', async function() {
    await this.token.sendTransaction({ from: fisrtAccount })
    expect(await this.token.balanceOf(fisrtAccount)).to.eq.BN(20)
  })
  it('another account should have 10 tokens after sending its 1st 0-ether transaction', async function() {
    await this.token.sendTransaction({ from: secondAccount })
    expect(await this.token.balanceOf(secondAccount)).to.eq.BN(10)
  })
  it('token contract should have a total supply of 30 tokens after those 3 transactions', async function() {
    expect(await this.token.totalSupply()).to.eq.BN(30)
  })
  it('and finally, it should not accept ether donations - free beer is free beer', async function() {
    await expectRevert(this.token.send(1, { from: secondAccount }))
  })
})
