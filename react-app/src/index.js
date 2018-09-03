import { configure } from 'mobx'
import React from 'react'
import ReactDOM from 'react-dom'
import truffleContractOf from 'truffle-contract'
import Web3 from 'web3'
import App from './App'
import AppStore from './AppStore'
import './index.css'
import { getUpdate } from './library/helpers/contract-helper'
import BeerToken from './truffle-project-build/contracts/BeerToken.json'
import CoinToken from './truffle-project-build/contracts/CoinToken.json'
import Erc20Bet from './truffle-project-build/contracts/Erc20BetExchange.json'

configure({
  enforceActions: true
})

window.configureMobx = configure

const startApp = async metamaskWeb3Provider => {
  const web3 = new Web3('http://localhost:8545')
  const web3MetaMask = new Web3(metamaskWeb3Provider)
  const origSendAsync = metamaskWeb3Provider.sendAsync.bind(metamaskWeb3Provider)
  metamaskWeb3Provider.sendAsync = (...args) => {
    const [arg0] = args
    const requests = Array.isArray(arg0) ? arg0 : [arg0]
    const filteredRequests = requests.filter(({ method }) => method !== 'eth_getFilterChanges')
    for (const { method, params } of filteredRequests) {
      if (method === 'method') console.log('sendAsync: %s: %o', method, params)
    }
    return origSendAsync(...args)
  }

  console.log({ web3 })
  window._web3 = web3
  const { selectedAddress: playerAddress, networkVersion } = await getUpdate(web3)

  const artifacts = [Erc20Bet, BeerToken, CoinToken]
  const contracts = artifacts.map(artifact => truffleContractOf(artifact))
  for (const contract of contracts) {
    contract.setProvider(web3.currentProvider)
    contract.defaults({ from: playerAddress })
  }
  const instances = await Promise.all(contracts.map(contract => contract.deployed()))

  const [bettingAddress, beerTokenAddress, coinTokenAddress] = instances.map(
    ({ address }) => address
  )

  const contractAddresses = { bettingAddress, beerTokenAddress, coinTokenAddress }

  const appStore = new AppStore({
    web3,
    web3MetaMask,
    networkVersion,
    playerAddress,
    contractAddresses
  })

  // // https://web3js.readthedocs.io/en/1.0/web3-eth.html#defaultaccount
  // web3.eth.defaultAccount = playerAddress

  window.appStore = appStore

  ReactDOM.render(<App appStore={appStore} />, document.getElementById('root'))
  // registerServiceWorker()
}

// window.addEventListener('load', () => {
//   let we3js
//   // Checking if Web3 has been injected by the browser (Mist/MetaMask)
//   if (typeof web3 !== 'undefined') {
//     // Use Mist/MetaMask's provider
//     web3js = new Web3(web3.currentProvider)
//   } else {
//     console.log('No web3? You should consider trying MetaMask!')
//     // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
//     web3js = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))
//   }

//   // Now you can start your app & access web3 freely:
//   //   startApp()
// })

// See https://github.com/MetaMask/faq/blob/master/detecting_metamask.md#detecting-metamask
window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    // Use the browser's ethereum provider
    // eslint-disable-next-line no-undef
    const provider = web3.currentProvider

    if (provider.isMetaMask) {
      console.log(`Decected MetaMask`)
      startApp(provider)
    } else {
      console.log('Detected non-MetaMask web3 provider')
    }
  } else {
    console.log('No web3? You should consider trying MetaMask!')
  }
})
