import React from 'react'

import TokenValue from './TokenValue'

import DetailedERC20Data from './truffle-project-build/contracts/DetailedERC20.json'
import ElectrobetData from './truffle-project-build/contracts/Electrobet.json'

import truffleContract from 'truffle-contract'

import { fromTokenAmount, BN_ZERO, toBN } from './library/helpers/contract-helper'

import { observable, computed, autorun, action, runInAction, flow } from 'mobx'
import { observer } from 'mobx-react'

export class TokenStore {
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
  pendingTxCount = 0

  @computed
  get hasPendingTransactions() {
    return this.pendingTxCount > 0
  }

  filters = []

  constructor({ appStore, blockchainStore, tokenAddress }) {
    const { web3, playerAddress, bettingAddress } = appStore
    this.blockchainStore = blockchainStore
    this.web3 = web3
    this.address = tokenAddress
    this.playerAddress = playerAddress
    this.bettingAddress = bettingAddress
    this.init()
  }

  async init() {
    const { web3 } = this

    this.contract = new web3.eth.Contract(DetailedERC20Data.abi, this.address, {
      from: this.playerAddress
    })

    this.approvalEventWatcher = new EventLogWatcher({
      blockchainStore: this.blockchainStore,
      web3: this.web3,
      contract: this.contract,
      event: 'Approval',
      onEvents: this.handleApprovalEvents.bind(this)
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
      this.decimals = parseInt(decimals)
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
    this.pendingTxCount++
    try {
      console.log(`web3.eth.defaultAccount = ${this.web3.eth.defaultAccount}`)
      await this.contract.methods.approve(this.bettingAddress, amount).send()
    } catch (err) {
      console.log(`'X’ġara?: ${err}`)
    } finally {
      runInAction('on receiving approve() response', async () => {
        this.pendingTxCount--
        console.log('About to await this.refreshAllowance()')
        await this.refreshAllowance()
      })
    }
  }

  handleApprovalEvents(events) {
    console.log(`Handling ${events.length} Approval events`)
    // this.refreshAllowance()
  }
}

@observer
export class Token extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      proposedAllowanceIncrease: BN_ZERO
    }
    this.handleApprovedChange = this.handleApprovedChange.bind(this)
    this.handleApprovalSubmit = this.handleApprovalSubmit.bind(this)
    this.handleApprovalReset = this.handleApprovalReset.bind(this)
  }

  get proposedAllowance() {
    const { allowance } = this.props.store
    const { proposedAllowanceIncrease } = this.state
    return allowance.add(proposedAllowanceIncrease)
  }

  // set proposedAllowance(amount) {
  //   const { allowance } = this.props.store
  //   const proposedAllowanceIncrease = amount.sub(allowance)
  //   this.setState({ proposedAllowanceIncrease })
  // }

  handleApprovedChange(proposedAllowance) {
    const { allowance } = this.props.store
    const proposedAllowanceIncrease = proposedAllowance.sub(allowance)
    this.setState({ proposedAllowanceIncrease })
  }

  async handleApprovalSubmit(event) {
    event.preventDefault()
    const { store } = this.props
    try {
      await store.allowBettingContractMaximumOf(this.proposedAllowance)
    } catch ({ message }) {
      console.log(`Err: ${message}`)
    } finally {
      this.setState({ proposedAllowanceIncrease: BN_ZERO })
    }
  }

  handleApprovalReset(event) {
    event.preventDefault()
    this.setState({ proposedAllowanceIncrease: BN_ZERO })
  }

  render() {
    const {
      name,
      address,
      symbol,
      decimals,
      balance,
      allowance,
      hasPendingTransactions
    } = this.props.store
    const showResetButton = !this.proposedAllowance.eq(allowance)
    return (
      <article className="box">
        <form onSubmit={this.handleApprovalSubmit} onReset={this.handleApprovalReset}>
          <fieldset disabled={hasPendingTransactions}>
            <table className="Token">
              <tbody>
                <tr>
                  <td>Name</td>
                  <td>{name}</td>
                </tr>
                <tr>
                  <td>Address</td>
                  <td>{address}</td>
                </tr>
                <tr>
                  <td>Balance</td>
                  <td>
                    <TokenValue symbol={symbol} decimals={decimals} value={balance} readOnly />
                  </td>
                </tr>
                <tr>
                  <td title="Token amount that you allow the betting contract to transfer from you to itself">
                    Allowance
                  </td>
                  <td>
                    <TokenValue symbol={symbol} decimals={decimals} value={allowance} readOnly />
                  </td>
                </tr>
                <tr>
                  <td>Change allowance to</td>
                  <td>
                    <TokenValue
                      symbol={symbol}
                      decimals={decimals}
                      value={this.proposedAllowance}
                      onValueChange={this.handleApprovedChange}
                    />{' '}
                    {showResetButton && <button type="reset">Reset</button>}{' '}
                    <button type="submit">Approve</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </fieldset>
        </form>
      </article>
    )
  }
}
