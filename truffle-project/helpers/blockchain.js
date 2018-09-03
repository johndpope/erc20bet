class EventLogWatcher {
  constructor({ contract, event, fromBlock = 0, filter = {}, onEvents }) {
    this.contract = contract
    this.fromBlock = fromBlock
    this.event = event
    this.filter = filter
    this.onEvents = onEvents
  }

  async fetchNewLogs(blockNumber) {
    if (blockNumber < this.fromBlock) {
      console.warn(`blockNumber = ${blockNumber} is smaller than fromBlock = ${this.fromBlock}`)
      return
    }

    const fromBlock = this.fromBlock
    const toBlock = blockNumber
    this.fromBlock = blockNumber + 1

    const { event, filter } = this
    const newLogs = await this.contract.getPastEvents(event, {
      fromBlock,
      toBlock,
      filter
    })

    const { _address: address } = this.contract

    const totEvents = newLogs.length
    if (totEvents) {
      const totBlocks = toBlock - fromBlock + 1
      console.log(
        `Blocks ${fromBlock}…${toBlock}/Contract ${address}: ` +
          `${totEvents} ${this.event} events in ${totBlocks} blocks`
      )
    }

    this.onEvents(newLogs)
  }
}

export { EventLogWatcher }
