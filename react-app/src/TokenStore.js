import { action, autorun, computed, observable, runInAction } from 'mobx'
import { EventLogWatcher } from './library/helpers/blockchain'
import { BN_ZERO, promisify, toBN } from './library/helpers/contract-helper'
import DetailedERC20Data from './truffle-project-build/contracts/DetailedERC20.json'

export default class TokenStore {
  @observable
  contract

  @observable
  name = ''

  @observable
  symbol = ''

  @observable
  decimals = 0

  @observable
  balance = BN_ZERO

  @observable
  allowance = BN_ZERO

  @observable
  pendingTxHash = null

  @computed
  get hasPendingTransactions() {
    return this.pendingTxHash !== null
  }

  filters = []

  constructor({ appStore, blockchainStore, tokenAddress }) {
    const { web3, web3MetaMask, playerAddress, bettingAddress } = appStore
    this.blockchainStore = blockchainStore
    this.web3 = web3
    this.web3MetaMask = web3MetaMask
    this.address = tokenAddress
    this.playerAddress = playerAddress
    this.bettingAddress = bettingAddress
    this.init()
  }

  async init() {
    const { web3, web3MetaMask } = this

    this.contract = new web3.eth.Contract(DetailedERC20Data.abi, this.address, {
      from: this.playerAddress
    })

    this.contractMetaMask = new web3MetaMask.eth.Contract(DetailedERC20Data.abi, this.address, {
      from: this.playerAddress
    })

    this.approvalEventWatcher = new EventLogWatcher({
      web3: this.web3,
      contract: this.contract,
      event: 'Approval',
      onEvents: this.handleApprovalEvents.bind(this),
      fromBlock: 0
    })

    this.transferEventWatcher = new EventLogWatcher({
      web3: this.web3,
      contract: this.contract,
      event: 'Transfer',
      onEvents: this.handleTransferEvents.bind(this),
      fromBlock: 0
    })

    autorun(() => {
      const { blockNumber } = this.blockchainStore
      this.approvalEventWatcher.fetchNewLogs(blockNumber)
      this.transferEventWatcher.fetchNewLogs(blockNumber)
    })

    const [name, symbol, decimals, balance, allowance] = await Promise.all([
      // ToDo: What happens if a generic token
      // a user adds does not have these fields?
      this.contract.methods.name().call(),
      this.contract.methods.symbol().call(),
      this.contract.methods.decimals().call(),

      this.contract.methods.balanceOf(this.playerAddress).call(),
      this.contract.methods.allowance(this.playerAddress, this.bettingAddress).call()
    ])
    // https://mobx.js.org/best/actions.html#async-await
    runInAction(() => {
      this.name = name
      this.symbol = symbol
      this.decimals = toBN(decimals).toNumber()
      this.balance = toBN(balance)
      this.allowance = toBN(allowance)
    })
  }

  @action
  async refreshBalance() {
    const balance = toBN(await this.contract.methods.balanceOf(this.playerAddress).call())
    runInAction(() => {
      this.balance = balance
    })
  }

  @action
  async refreshAllowance() {
    const allowance = toBN(
      await this.contract.methods.allowance(this.playerAddress, this.bettingAddress).call()
    )
    runInAction(() => {
      this.allowance = allowance
    })
  }

  @action
  async allowBettingContractMaximumOf(amount) {
    this.pendingTxHash = 'placeholder'
    let txHash
    try {
      txHash = await promisify(cb =>
        this.contractMetaMask.methods.approve(this.bettingAddress, amount).send({}, cb)
      )
    } catch (err) {
      console.error(err)
      runInAction(() => {
        this.pendingTxHash = null
      })
    }
    if (txHash) {
      runInAction(() => {
        this.pendingTxHash = txHash
      })
    }
  }

  handleApprovalEvents(logs) {
    if (logs.length > 0) {
      console.log(`${this.name}: Handling ${logs.length} Approval events`)
      if (
        this.pendingTxHash !== null &&
        logs.some(log => log.transactionHash === this.pendingTxHash)
      ) {
        runInAction(() => {
          this.pendingTxHash = null
        })
      }
      this.refreshAllowance()
    }
  }

  handleTransferEvents(logs) {
    if (logs.length > 0) {
      console.log(`${this.name}: Handling ${logs.length} Transfer events`)
      this.refreshBalance()
    }
  }
}
