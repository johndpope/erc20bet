import React, { Component } from 'react'

import moment from 'moment'

class TimestampValue extends Component {
  constructor(props) {
    super(props)
    this.state = {
      tickerIntervalId: 0,
      currentTimestamp: 0
    }
    this.handleInputValueChange = this.handleInputValueChange.bind(this)
  }

  handleInputValueChange(event) {
    const { onValueChange } = this.props
    const inputValue = event.target.value
    const date = inputValue ? new Date(inputValue) : new Date()
    onValueChange(Math.max(0, Math.floor(date.getTime() / 1000)))
  }

  componentDidMount() {
    const tickerIntervalId = setInterval(this.tick.bind(this), 1000)
    this.setState({ tickerIntervalId })
  }

  componentWillUnmount() {
    const { tickerIntervalId } = this.state
    clearInterval(tickerIntervalId)
    this.setState({ tickerIntervalId: 0 })
  }

  tick() {
    const currentTimestamp = Math.floor(Date.now() / 1000)
    this.setState({ currentTimestamp })
  }

  render() {
    const { value, readOnly } = this.props
    const { currentTimestamp } = this.state
    const date = new Date(1000 * value)
    const mom = moment(date)
    const formattedDate = mom.format('YYYY-MM-DDTHH:mm:ss.SSS')
    const expiryMsg = `${currentTimestamp < value ? 'expiring' : 'expired'} ${mom.fromNow()}`
    return (
      <span>
        <input
          type="datetime-local"
          value={formattedDate}
          // min={0}
          // step={2 ** -8}
          // max={1}
          onChange={this.handleInputValueChange}
          readOnly={readOnly}
        />{' '}
        ({expiryMsg})
      </span>
    )
  }
}

export default TimestampValue
