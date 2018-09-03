import { action, observable, runInAction } from 'mobx'
import { observer } from 'mobx-react'
import React from 'react'
import Token from './Token'
import TokenStore from './TokenStore'

export class BlockchainStore {
  appStore

  @observable
  blockNumber = 0

  @observable.shallow
  tokens = new Map()

  constructor({ appStore, tokenAddresses }) {
    this.appStore = appStore
    this.tokens = new Map(
      tokenAddresses.map(tokenAddress => [
        tokenAddress,
        new TokenStore({ appStore, blockchainStore: this, tokenAddress })
      ])
    )

    this.updateBlockNumberAsync()
  }

  async updateBlockNumberAsync() {
    const { web3 } = this.appStore
    const blockNumber = await web3.eth.getBlockNumber()
    runInAction(() => {
      this.blockNumber = blockNumber
    })
    setTimeout(() => this.updateBlockNumberAsync(), 1000)
  }

  @observable.shallow
  contracts = new Map()

  @observable
  logs = []

  // @action
  addContract({ abi, address }) {
    const { web3 } = this.appStore
    if (!this.contracts.has(address)) {
      this.contracts.set(address, new web3.eth.Contract(abi, address))
    }
  }

  @action
  addToken(tokenAddress) {
    const { appStore } = this
    if (!this.tokens.has(tokenAddress)) {
      this.tokens.set(tokenAddress, new TokenStore({ appStore, tokenAddress }))
    }
  }
}

@observer
export class Blockchain extends React.Component {
  render() {
    const { blockNumber, tokens: tokenStores, appStore } = this.props.blockchainStore
    const { playerAddress } = appStore
    return (
      <div className="box">
        <header>Blockchain</header>
        <main>
          <div>
            <div>🔗 Block № {blockNumber}</div>
            <div>🔑 Current account is {playerAddress}</div>
          </div>
          <div>
            {[...tokenStores.values()].map(tokenStore => (
              <Token key={tokenStore.address} store={tokenStore} />
            ))}
          </div>
        </main>
      </div>
    )
  }
}
