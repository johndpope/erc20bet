import { observable, autorun } from 'mobx'

class Storage {
  @observable
  data = {}

  constructor({ playerAddress, networkVersion }) {
    const key = `${playerAddress}@${networkVersion}`
    this.data = JSON.parse(localStorage.getItem(key) || '{}')
    autorun(() => this.persist())
  }

  persist() {
    localStorage.setItem(key, JSON.stringify(this.data))
  }
}

class App {
  @observable
  playerAddress

  @observable
  networkVersion

  constructor({ playerAddress, networkVersion }) {
    this.playerAddress = playerAddress
    this.networkVersion = networkVersion
  }

  @computed
  get player() {
    return new Player({ playerAddress })
  }

  @computed
  get storage() {
    return new Storage({ playerAddress, networkVersion })
  }

  getPlayer({ address }) {}
}

class Player {
  constructor({ app }) {
    this.app = app
  }
}

class OnChainBet {
  constructor({ blockchain, betId }) {
    this.blockchain = blockchain
    this.betId = betId
  }
}

class BlockchainBettingContract {
  constructor({ blockchain, address }) {
    this.blockchain = blockchain
    this.address = address
  }
}

class Blockchain {
  @observable
  tokens = []

  @observable
  onChainBets = []

  //   @observable

  constructor({ app }) {
    this.app = app
  }

  getOnChainBets() {
    const { player } = this.app
    return [new OnChainBet({ blockchain: this })]
  }

  getToken({ player }) {}
}

class BlockchainPlayer {}

class BlockchainPlayerToken {}

class BlockchainGame {}

class BlockchainBet {}

class Player {
  constructor({ address }) {
    this.address = address
  }
}
