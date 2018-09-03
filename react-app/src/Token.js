import { observer } from 'mobx-react'
import React from 'react'
import HexValue from './HexValue'
import { BN_ZERO } from './library/helpers/contract-helper'
import TokenValue from './TokenValue'

@observer
export default class Token extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      proposedAllowanceIncrease: BN_ZERO,
      isCollapsed: false
    }
    this.handleApprovedChange = this.handleApprovedChange.bind(this)
    this.handleApprovalSubmit = this.handleApprovalSubmit.bind(this)
    this.handleApprovalReset = this.handleApprovalReset.bind(this)
    this.handleCollapseOrExpand = this.handleCollapseOrExpand.bind(this)
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

  handleCollapseOrExpand() {
    this.setState(prevState => ({
      isCollapsed: !prevState.isCollapsed
    }))
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
    const { isCollapsed } = this.state
    const showResetButton = !this.proposedAllowance.eq(allowance)
    return (
      <article className="box">
        <main>
          {isCollapsed ? (
            <div>
              <HexValue short value={address} />
              {' | '}
              <span>
                You own{' '}
                <TokenValue
                  symbol={symbol}
                  decimals={decimals}
                  value={balance}
                  symbolLast
                  readOnly
                />
              </span>
              {' | '}
              <span>
                Casino may spend{' '}
                <TokenValue
                  symbol={symbol}
                  decimals={decimals}
                  value={allowance}
                  symbolLast
                  readOnly
                />
              </span>
            </div>
          ) : (
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
                      <td>
                        <HexValue short value={address} />
                      </td>
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
                        <TokenValue
                          symbol={symbol}
                          decimals={decimals}
                          value={allowance}
                          readOnly
                        />
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
          )}
          {/* <div className="expand-collapse" onClick={this.handleCollapseOrExpand}>
            {isCollapsed ? 'expand' : 'collapse'}
          </div> */}
        </main>
      </article>
    )
  }
}
