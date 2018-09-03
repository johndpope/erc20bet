import { computed, observable } from 'mobx'
import {
  bufferToHex,
  randomBytes32Hex,
  signTypedData,
  soliditySha3,
  toBN,
  toTokenAmount,
  toBuffer,
  fromRpcSig
} from './library/helpers/contract-helper'

export default class BetStore {
  appStore

  @observable
  tokenStore

  @observable
  stake

  @observable
  payout

  @observable
  prob

  @observable
  expiry

  @observable
  nonce

  @computed
  get id() {
    const { address: tokenContractAddress } = this.tokenStore
    const { playerAddress, bettingAddress: bettingContractAddress } = this.appStore
    const _params = [
      ['address', 'player', playerAddress],
      ['address', 'token', tokenContractAddress],
      ['uint256', 'stake', this.stake],
      ['uint256', 'payout', this.payout],
      ['uint32', 'prob', this.prob],
      ['uint256', 'expiry', this.expiry],
      ['uint256', 'nonce', this.nonce],
      ['address', 'betContract', bettingContractAddress]
    ].map(([type, name, value]) => ({ type, name, value }))
    return bufferToHex(soliditySha3(..._params.map(({ type, value }) => ({ type, value }))))
  }

  constructor({ appStore, tokenStore }) {
    this.appStore = appStore
    this.tokenStore = tokenStore
    this.stake = toTokenAmount(1, tokenStore.decimals)
    this.payout = toTokenAmount(2, tokenStore.decimals)
    this.prob = toBN(0x80000000)
    this.expiry = toBN(Math.floor(Date.now() / 1000) + 600)
    this.nonce = toBN(randomBytes32Hex())
  }

  async sign() {
    const { address: tokenContractAddress } = this.tokenStore
    const { playerAddress, bettingAddress: bettingContractAddress } = this.appStore

    console.log({ appStore: this.appStore })
    const params = [
      ['address', 'token', tokenContractAddress],
      ['uint256', 'stake', this.stake],
      ['uint256', 'payout', this.payout],
      ['uint32', 'prob', this.prob],
      ['uint256', 'expiry', this.expiry],
      ['uint256', 'nonce', this.nonce],
      ['address', 'betContract', bettingContractAddress]
    ].map(([type, name, value]) => ({ type, name, value }))

    console.log({ params })
    const msgParams = params.map(({ type, name, value }) => ({
      type,
      name,
      value: value.toString()
    }))

    const { web3MetaMask } = this.appStore

    console.log({ web3MetaMask })

    const sigResult = await signTypedData(web3MetaMask.currentProvider, msgParams, playerAddress)
    const sig = toBuffer(sigResult.result)
    const { v, r: rBuffer, s: sBuffer } = fromRpcSig(sig)
    const [r, s] = [rBuffer, sBuffer].map(bufferToHex)

    console.log({ v, r, s })

    // const betId = soliditySha3(...params.map(({ type, value }) => ({ type, value })))

    // const paramsDict = {}
    // for (let { name, value } of params) {
    //   paramsDict[name] = str(value)
    // }

    // const putData = {
    //   ...paramsDict,
    //   ...{ r, s, v }
    // }
  }
}
