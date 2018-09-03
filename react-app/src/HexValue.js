import React from 'react'
import copyToClipboard from './library/helpers/copy-to-clipboard'

class HexValue extends React.Component {
  constructor(props) {
    super(props)
    this.handleInputValueChange = this.handleInputValueChange.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }

  handleInputValueChange(event) {
    // const { onValueChange } = this.props
    // onValueChange(Math.max(0, Math.floor(date.getTime() / 1000)))
  }

  handleClick() {
    const { value } = this.props
    copyToClipboard(value)
  }

  render() {
    const { value, short, readOnly } = this.props
    const formatted = short
      ? value.replace(/^(0x[0-9a-f]{4})[0-9a-f]+([0-9a-f]{4})$/i, '$1…$2')
      : value
    const n = (value.length - '0x'.length) / 2
    const name = n === 20 ? 'address' : `${n}-byte hex value`
    return (
      // <input
      //   type="text"
      //   value={formatted}
      //   // onChange={this.handleInputValueChange}
      //   readOnly
      // />
      <code className="copy-hex" onClick={this.handleClick} title={`Click to copy ${name}`}>
        {formatted}
      </code>
    )
  }
}

export default HexValue
