import ethJSABI from 'ethjs-abi'

import { toBigNumber } from './contract-helper'
/**
 * Decode a raw web3 log into a truffle-contract log (with named args)
 *
 * Lifted from https://github.com/trufflesuite/truffle/blob/v4.1.14/packages/truffle-contract/contract.js#L44
 *
 * @param {TruffleContract} C - Truffle Contract (before instantiating)
 * @param {Object} rawLog - a log as returned by web3
 */

//  function decodeLog(C, log) {
//   const logABI = C.events[log.topics[0]]

function decodeLog(C, rawLog) {
  const logABI = C.events[rawLog.topics[0]]

  if (logABI == null) {
    return null
  }

  // This function has been adapted from web3's SolidityEvent.decode() method,
  // and built to work with ethjs-abi.

  const copy = { ...rawLog }

  function partialABI(fullABI, indexed) {
    const inputs = fullABI.inputs.filter(i => i.indexed === indexed)

    const partial = {
      inputs,
      name: fullABI.name,
      type: fullABI.type,
      anonymous: fullABI.anonymous
    }

    return partial
  }

  const argTopics = logABI.anonymous ? copy.topics : copy.topics.slice(1)
  const indexedData = `0x${argTopics.map(topics => topics.slice(2)).join('')}`
  const indexedParams = ethJSABI.decodeEvent(partialABI(logABI, true), indexedData)

  const notIndexedData = copy.data
  const notIndexedParams = ethJSABI.decodeEvent(partialABI(logABI, false), notIndexedData)

  copy.event = logABI.name

  copy.args = logABI.inputs.reduce((acc, current) => {
    let val = indexedParams[current.name]

    if (val === undefined) {
      val = notIndexedParams[current.name]
    }

    acc[current.name] = val
    return acc
  }, {})

  Object.keys(copy.args).forEach(key => {
    const val = copy.args[key]

    // We have BN. Convert it to BigNumber
    if (val.constructor.isBN) {
      copy.args[key] = toBigNumber(`0x${val.toString(16)}`)
    }
  })

  delete copy.data
  delete copy.topics

  return copy
}

export default decodeLog
