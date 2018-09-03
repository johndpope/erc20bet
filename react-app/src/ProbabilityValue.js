import React, { Component } from 'react'

class ProbabilityValue extends Component {
  constructor(props) {
    super(props)
    this.handleInputValueChange = this.handleInputValueChange.bind(this)
  }

  handleInputValueChange(event) {
    const { onValueChange } = this.props
    let p = parseFloat(event.target.value)
    p = Math.floor(p * 2 ** 32)
    p = Math.max(0, Math.min(p, 2 ** 32 - 1))
    onValueChange(p)
  }

  render() {
    const { symbol, value, readOnly } = this.props
    const normalizedValue = value / 2 ** 32
    return (
      <span>
        {symbol}
        &nbsp;
        <input
          type="number"
          value={normalizedValue}
          min={0}
          step={2 ** -8}
          max={1}
          onChange={this.handleInputValueChange}
          readOnly={readOnly}
        />
      </span>
    )
  }
}

export default ProbabilityValue
