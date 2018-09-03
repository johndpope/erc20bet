import React, { Component } from 'react'

import TokenValue from './TokenValue'
import ProbabilityValue from './ProbabilityValue'
import TimestampValue from './TimestampValue'
import Uint256Value from './Uint256Value'
import HexValue from './HexValue'
import { observer } from 'mobx-react'
import { action } from 'mobx'
import { BN_MAX_UINT32 } from './library/helpers/contract-helper'

@observer
class Bet extends Component {
  constructor(props) {
    super(props)
    this.handleStakeChange = this.handleStakeChange.bind(this)
    this.handlePayoutChange = this.handlePayoutChange.bind(this)
    this.handleProbChange = this.handleProbChange.bind(this)
    this.handleExpiryChange = this.handleExpiryChange.bind(this)
    this.handleSign = this.handleSign.bind(this)
    this.handleTokenChange = this.handleTokenChange.bind(this)
  }

  @action
  handleTokenChange(event) {
    const {
      blockchainStore: { tokens: tokenStores },
      betStore
    } = this.props
    betStore.tokenStore = tokenStores.get(event.target.value)
  }

  @action
  handleStakeChange(stake) {
    this.props.betStore.stake = stake
  }

  @action
  handlePayoutChange(payout) {
    this.props.betStore.payout = payout
  }

  @action
  handleProbChange(prob) {
    this.props.betStore.prob = prob
  }

  @action
  handleExpiryChange(expiry) {
    this.props.betStore.expiry = expiry
  }

  handleSign() {
    const { betStore } = this.props
    betStore.sign()
  }
  //                   <select
  //                     value={selectedTokenAddress}
  //                     onChange={this.handleSelectedTokenAddressChange}
  //                   >
  //                     {tokens.map(token => (
  //                       <option key={token.address} value={token.address}>
  //                         {token.name || token.address}
  //                       </option>
  //                     ))}
  //                   </select>

  get summary() {
    const { betStore } = this.props
    const { tokenStore, stake, payout, prob, expiry, nonce } = betStore
    const { symbol, decimals } = tokenStore

    const probFormatted = (prob.toNumber() / BN_MAX_UINT32.toNumber()).toLocaleString('en-US', {
      style: 'percent',
      minimumSignificantDigits: 2,
      maximumSignificantDigits: 2
    })

    return (
      `You bet ${stake} ${symbol} with ${probFormatted} chance of winning. ` +
      `If you lose, you take back nothing; ` +
      `if you win, you take back ${payout} ${symbol}.`
    )
  }

  render() {
    const {
      blockchainStore: { tokens: tokenStores },
      betStore,
      readOnly
    } = this.props
    const { tokenStore, stake, payout, prob, expiry, nonce } = betStore
    return (
      <section className="box">
        <main>
          <table>
            <tbody>
              <tr>
                <td>Id</td>
                <td>
                  <HexValue value={betStore.id} short />
                </td>
              </tr>
              <tr>
                <td>Token</td>
                <td>
                  <div>
                    <span>{tokenStore.name}</span>
                    {/* {readOnly ? (
                    <span>{tokenStore.name}</span>
                  ) : (
                    <select value={tokenStore.address} onChange={this.handleTokenChange}>
                      {[...tokenStores.values()].map(_tokenStore => (
                        <option key={_tokenStore.address} value={_tokenStore.address}>
                          {_tokenStore.name || _tokenStore.address}
                        </option>
                      ))}
                    </select>
                  )} */}
                  </div>
                </td>
              </tr>
              <tr>
                <td>Stake</td>
                <td>
                  <TokenValue
                    symbol={tokenStore.symbol}
                    decimals={tokenStore.decimals}
                    value={stake}
                    onValueChange={this.handleStakeChange}
                    readOnly={readOnly}
                  />
                </td>
              </tr>
              <tr>
                <td>Payout</td>
                <td>
                  <TokenValue
                    symbol={tokenStore.symbol}
                    decimals={tokenStore.decimals}
                    value={payout}
                    onValueChange={this.handlePayoutChange}
                    readOnly={readOnly}
                  />
                </td>
              </tr>
              <tr>
                <td>Probability</td>
                <td>
                  <ProbabilityValue
                    value={prob}
                    onValueChange={this.handleProbChange}
                    readOnly={readOnly}
                  />
                </td>
              </tr>
              <tr>
                <td>Valid until</td>
                <td>
                  <TimestampValue
                    value={expiry}
                    onValueChange={this.handleExpiryChange}
                    readOnly={readOnly}
                  />
                </td>
              </tr>
              <tr>
                <td>Nonce</td>
                <td>
                  <Uint256Value value={nonce} readOnly={readOnly} />
                </td>
              </tr>
              {/* <tr>
              <td>Summary</td>
              <td style={{ fontSize: 'small' }}>{this.summary}</td>
            </tr> */}
            </tbody>
          </table>
          {/* <div>
            <button onClick={this.handleSign}>Test sign bet & check with contract</button>
          </div> */}
        </main>
      </section>
    )
  }
}

export default Bet
