import { buildMerkleTree } from 'openzeppelin-solidity/test/helpers/merkleTree'
import { zip } from './arrays'
import { BN_ZERO } from './contract-helper'

const reconstructTicketsFromGameLogs = allEvents => {
  const [{ gameId, outcomeProbs, ticketHashes, ticketOutcomeSubscripts }] = allEvents
    .filter(({ event }) => event === 'GameOpened')
    .map(({ args }) => args)

  const betMatchedEvents = allEvents
    .filter(({ event }) => event === 'BetMatched')
    .map(({ args }) => args)

  // console.log({ gameId, outcomeProbs, ticketHashes, ticketOutcomeSubscripts })

  const minResults = new Array(outcomeProbs.length)
  const maxResults = new Array(outcomeProbs.length)
  minResults[0] = BN_ZERO
  maxResults[0] = outcomeProbs[0].subn(1)
  for (let i = 1; i < outcomeProbs.length; i++) {
    minResults[i] = maxResults[i - 1].addn(1)
    maxResults[i] = maxResults[i - 1].add(outcomeProbs[i])
  }
  const minMaxResultPairs = zip(minResults, maxResults)

  const { proofs } = buildMerkleTree(ticketHashes)

  const bets = {}

  let ticketSubscript = 0
  for (let i = 0; i < betMatchedEvents.length; i++) {
    const { betId, betOwner, payout, numTickets } = betMatchedEvents[i]
    const tickets = []
    for (let j = 0; j < numTickets; j++, ticketSubscript++) {
      const outcomeSubscript = ticketOutcomeSubscripts[ticketSubscript]
      const proof = proofs[ticketSubscript]
      const [minResult, maxResult] = minMaxResultPairs[outcomeSubscript]
      tickets.push({ minResult, maxResult, proof })
    }
    bets[betOwner] = { betId, payout, tickets }
  }
  return { gameId, bets }
}

export default reconstructTicketsFromGameLogs
