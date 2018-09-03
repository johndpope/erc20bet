import React, { Component } from 'react'

import { str } from './library/helpers/contract-helper'

class Uint256Value extends Component {
  constructor(props) {
    super(props)
    this.handleInputValueChange = this.handleInputValueChange.bind(this)
  }

  handleInputValueChange(event) {
    // const { onValueChange } = this.props
    // onValueChange(Math.max(0, Math.floor(date.getTime() / 1000)))
  }

  render() {
    const { value, hex, readOnly } = this.props
    let formatted
    if (hex) {
      formatted = `0x${value.toString(16).padStart(64, '0')}`
    } else {
      formatted = str(value)
    }
    return (
      <input
        type="text"
        value={formatted}
        // onChange={this.handleInputValueChange}
        readOnly
      />
    )
  }
}

export default Uint256Value
