import React, { Component } from 'react'

import BigNumber from 'bignumber.js'
import { toBN } from './library/helpers/contract-helper'

// export const toTokenAmount = (n, decimals) => toBN(n).mul(toBN(10).pow(toBN(decimals)))

// export const fromTokenAmount = (amount, decimals) => amount.div(toBN(10).pow(toBN(decimals)))

class TokenValue extends Component {
  constructor(props) {
    super(props)
    this.handleInputValueChange = this.handleInputValueChange.bind(this)
  }

  handleInputValueChange(event) {
    event.preventDefault() // ToDo: Is this necessary?
    const { decimals, onValueChange } = this.props
    const multiplier = new BigNumber(10).pow(decimals)
    let num = new BigNumber(event.target.value || 0).multipliedBy(multiplier).integerValue()
    const bn = toBN(num.isNegative() ? num.negated() : num)
    onValueChange(bn)
  }

  render() {
    const { symbol, decimals, value, readOnly, symbolLast } = this.props
    const multiplier = new BigNumber(10).pow(decimals)
    const normalizedValue = new BigNumber(value).dividedBy(multiplier).toNumber()
    if (readOnly) {
      const formatted = normalizedValue.toLocaleString('en-US', {
        style: 'decimal',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })
      const phrase = symbolLast ? `${formatted} ${symbol}` : `${symbol} ${formatted}`
      return <span>{phrase}</span>
    } else {
      const step = 10 ** -Math.min(decimals, 3)
      return (
        <span>
          {symbol}
          &nbsp;
          <input
            type="number"
            value={normalizedValue}
            min={0}
            step={step}
            onChange={this.handleInputValueChange}
            readOnly={readOnly}
          />
        </span>
      )
    }
  }
}

export default TokenValue
