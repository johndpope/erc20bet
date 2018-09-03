import assert from 'assert'
// import { unzip } from './arrays'
import axios from 'axios'

import ethUtil, { bufferToHex } from 'ethereumjs-util'

import { signTypedData, isAddress, isBN, soliditySha3, str, toBN } from './helpers/contract-helper'

// ToDo: Sequence number?

const BET_STRUCT_PARAMS = [
  ['bytes32', 'id'],
  // ['address', 'player'],
  ['address', 'token'],
  ['uint256', 'stake'],
  ['uint256', 'payout'],
  ['uint32', 'prob'],
  ['uint256', 'expiry'],
  ['uint256', 'nonce'],
  ['address', 'betContract']
].map(([type, name]) => ({ type, name }))

const decodeStruct = (params, data) => {
  const struct = {}
  for (const { type, name } of BET_STRUCT_PARAMS) {
    const encoded = data[name]
    let decoded
    switch (type) {
      case 'uint32':
      case 'uint256':
        decoded = toBN(encoded)
        break
      default:
        decoded = encoded
    }
    struct[name] = decoded
  }
  return struct
}

/** The server, as seen by the client. */
export default class Server {
  // Note: In the real application, the player would have to sign in
  // in order to retrieve its own bets, for example, but here
  // we keep things simple and speciy the player address explicitly.
  constructor(endpoint, web3CurrentProvider, bettingContractAddress, playerAddress) {
    this.endpoint = endpoint
    this.web3CurrentProvider = web3CurrentProvider
    assert(isAddress(bettingContractAddress))
    assert(isAddress(playerAddress), `${playerAddress} is not a valid Ethereum address`)
    this.bettingContractAddress = bettingContractAddress
    this.playerAddress = playerAddress
  }

  async putBet({ tokenContractAddress, stake, payout, prob, expiry, nonce }) {
    assert(isAddress(tokenContractAddress))
    assert(isBN(stake))
    assert(isBN(payout))
    assert(isBN(prob))
    assert(isBN(expiry))
    assert(isBN(nonce))

    console.log({ nonce })
    const params = [
      ['address', 'player', this.playerAddress],
      ['address', 'token', tokenContractAddress],
      ['uint256', 'stake', stake],
      ['uint256', 'payout', payout],
      ['uint32', 'prob', prob],
      ['uint256', 'expiry', expiry],
      ['uint256', 'nonce', nonce],
      ['address', 'betContract', this.bettingContractAddress]
    ].map(([type, name, value]) => ({ type, name, value }))

    const msgParams = params
      .filter(({ name }) => name !== 'player')
      .map(({ type, name, value }) => ({ type, name, value: str(value) }))

    console.log({ msgParams })
    // ToDo: At this point, verify the validity of this bet directly with the contract?

    const sigResult = await signTypedData(this.web3CurrentProvider, msgParams, this.playerAddress)
    const sig = ethUtil.toBuffer(sigResult.result)
    const { v, r: rBuffer, s: sBuffer } = ethUtil.fromRpcSig(sig)
    const [r, s] = [rBuffer, sBuffer].map(bufferToHex)
    const betId = soliditySha3(...params.map(({ type, value }) => ({ type, value })))

    const paramsDict = {}
    for (let { name, value } of params) {
      paramsDict[name] = str(value)
    }

    const putData = {
      ...paramsDict,
      ...{ r, s, v }
    }

    let rsp
    try {
      rsp = await axios.put(`${this.endpoint}/bets/${betId}`, putData)
    } catch (err) {
      console.log(`Error: ${err}`)
    }
    if (rsp) {
      console.log('Received response from server')
      console.log({ rsp })
    }
  }

  async getBets() {
    const { data: encodedBets } = await axios.get(
      `${this.endpoint}/bets/?player=${this.playerAddress}`
    )
    return encodedBets.map(encodedBet => decodeStruct(BET_STRUCT_PARAMS, encodedBet))
  }

  async getBet(betId) {}

  deleteBet(betId) {
    return axios.delete(`${this.endpoint}/bets/${betId}`)
  }
}
