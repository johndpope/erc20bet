import { autorun, computed, observable } from 'mobx'
import BetStore from './BetStore'
import { BlockchainStore } from './Blockchain'

class GameViewStore {
  constructor({ appStore, gameStore }) {
    this.appStore = appStore
    this.gameStore = gameStore
  }
}

class BetViewStore {
  constructor({ appStore, betStore }) {
    this.appStore = appStore
    this.betStore = betStore
    const gameStore = { id: `game-for-bet-${betStore.id}` }
    this.gameViewStore = new GameViewStore({ appStore, gameStore })
  }
}

class TokenViewStore {
  constructor({ appStore, tokenStore }) {
    this.appStore = appStore
    this.tokenStore = tokenStore
  }

  @computed
  get betStores() {
    const betStores = [...this.appStore.betStores.values()]
    return betStores.map(({ tokenStore }) => tokenStore === this.tokenStore)
  }

  @computed
  get betViewStores() {
    const betStores = [...this.appStore.betStores.values()]
    const tokenBetStores = betStores.map(({ tokenStore }) => tokenStore === this.tokenStore)
    return tokenBetStores.map(betStore => new BetViewStore({ appStore: this.appStore, betStore }))
  }

  @computed
  get gameViewStores() {
    return this.betViewStores.map(({ gameViewStore }) => gameViewStore)
  }
}

export default class AppStore {
  @computed
  get data() {
    return {
      tokens: [...this.blockchainStore.tokens.keys()]
    }
  }

  @observable.shallow
  betStores = []

  constructor({ web3, web3MetaMask, networkVersion, playerAddress, contractAddresses }) {
    this.web3 = web3
    this.web3MetaMask = web3MetaMask
    this.networkVersion = networkVersion
    this.playerAddress = playerAddress
    const { bettingAddress, beerTokenAddress, coinTokenAddress } = contractAddresses
    this.bettingAddress = bettingAddress
    this.blockchainStore = new BlockchainStore({
      appStore: this,
      tokenAddresses: [beerTokenAddress, coinTokenAddress]
    })
    const persistData = () => {
      const key = `${this.playerAddress}@${this.networkVersion}`
      localStorage.setItem(key, JSON.stringify(this.data))
    }
    autorun(persistData)

    this.createBet()
    // this.createBet()
  }

  createBet() {
    const [[, tokenStore]] = [...this.blockchainStore.tokens]
    this.betStores.push(new BetStore({ appStore: this, tokenStore }))
  }

  @computed
  get tokenViewStores() {
    const betStores = [...this.betStores.values()]
    const tokenStores = new Set(betStores.map(({ tokenStore }) => tokenStore))
    return [...tokenStores].map(tokenStore => new TokenViewStore({ appStore: this, tokenStore }))
  }
}
