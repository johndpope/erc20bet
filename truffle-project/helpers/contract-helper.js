import { bufferToHex, toChecksumAddress, fromRpcSig, toBuffer } from 'ethereumjs-util'
import BigNumber from 'bignumber.js'
import { isAddress, isBN, toBN, soliditySha3 } from 'web3-utils'
import { flatten } from './arrays'

export { bufferToHex, toChecksumAddress, fromRpcSig, toBuffer }

export { isAddress, isBN, toBN, soliditySha3 }

export const isBytes32Hex = str => /^0x[0-9a-f]{64}$/.test(str)

export const ZERO = toBN(0)

export const BN_ZERO = toBN(0)

export const BN_MAX_UINT32 = toBN(2).pow(toBN(32))

export const toTokenAmount = (numeric, decimals) => {
  const multiplier = new BigNumber(10).pow(decimals)
  return toBN(new BigNumber(numeric).multipliedBy(multiplier).integerValue(BigNumber.ROUND_FLOOR))
}

export const fromTokenAmount = (amount, decimals) => {
  const multiplier = new BigNumber(10).pow(decimals)
  return new BigNumber(amount).dividedBy(multiplier).toNumber()
}

/**
 * Handy function that takes a function that operates with (err, result) => {},
 * and makes it return a Promise instead.
 * @param {Function} cbReceiver - A function that receives a callback function (err, result) => void, and
 *                              makes the call to the original function passing the callback
 *                              somewhere.
 */
export const promisify = cbReceiver =>
  new Promise((resolve, reject) => {
    cbReceiver((err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })

export const getContractEventsForTx = async (contract, receipt) => {
  const { blockNumber, transactionHash: targetTxHash } = receipt
  const logs = await contract.getPastEvents('allEvents', {
    fromBlock: blockNumber,
    toBlock: blockNumber
  })
  return logs.filter(({ transactionHash }) => transactionHash === targetTxHash)
}

export const getAllContractEventsForTx = async (contracts, receipt) => {
  const events = flatten(await Promise.all(contracts.map(c => getContractEventsForTx(c, receipt))))
    .slice(0)
    .sort(({ logIndex: i1 }, { logIndex: i2 }) => i1 - i2)

  const unaccountedFor = receipt.logs.length - events.length
  if (unaccountedFor !== 0) {
    throw new Error(
      `${unaccountedFor} logs unaccounted for - are you sure you passed all contracts that emitted events in that transaction?`
    )
  }
  return events
}

export const signTypedData = (provider, msgParams, from) =>
  promisify(callback =>
    provider.sendAsync({ method: 'eth_signTypedData', params: [msgParams, from], from }, callback)
  )

const uint8ArrayToHex = array =>
  `0x${[...array].map(n => n.toString(16).padStart(2, '0')).join('')}`

export const randomBytes32Hex = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return uint8ArrayToHex(bytes)
}

export const str = value => {
  if (isBN(value)) {
    return value.toString(10)
  } else {
    return value.toString()
  }
}

export const sendAsync = provider => data => promisify(cb => provider.sendAsync(data, cb))

export const getAccounts = web3 => promisify(cb => web3.eth.getAccounts(cb))

export const getNetwork = web3 => promisify(cb => web3.version.getNetwork(cb))

// See https://medium.com/crowdbotics/building-ethereum-dapps-with-meta-mask-9bd0685dfd57
// Return in the same format as MetaMask when it uses web3 1.0
export const getUpdate = async web3 => {
  const [[selectedAddress], networkVersion] = await Promise.all([
    web3.eth.getAccounts(),
    web3.eth.net.getId()
  ])
  return { selectedAddress, networkVersion }
}
