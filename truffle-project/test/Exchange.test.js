/* eslint-disable no-await-in-loop */

import bip39 from 'bip39'
import ethSigUtil from 'eth-sig-util'
import ethAbi from 'ethereumjs-abi'
import ethUtil, { toBuffer, toChecksumAddress, bufferToHex } from 'ethereumjs-util'
import hdkey from 'ethereumjs-wallet/hdkey'
import { buildMerkleTree } from 'openzeppelin-solidity/test/helpers/merkleTree'
import { unzip, zip, flatten } from '../helpers/arrays'
import { BN_ZERO, getAllContractEventsForTx, toBN, toTokenAmount } from '../helpers/contract-helper'
import reconstructTicketsFromGameLogs from '../helpers/decode-game-logs'
import expect from '../helpers/expect-using-bn'
import { expectLogsToBeEqual, expectRevert } from '../helpers/tests'

const Erc20BetExchange = artifacts.require('Exchange')
const TrustedRNGFactory = artifacts.require('TrustedRNGFactory')
const TrustedRNG = artifacts.require('TrustedRNG')
const WrappedETHToken = artifacts.require('WrappedETHToken')
const CoinToken = artifacts.require('tokens/CoinToken')

const extractEnumValues = (contractName, enumName) => {
  const artifact = artifacts.require(contractName)
  const contractJson = artifact._json // eslint-disable-line no-underscore-dangle
  const [{ nodes }] = contractJson.ast.nodes.filter(({ name }) => name === contractName)
  const [{ members }] = nodes.filter(({ name }) => name === enumName)
  const values = {}
  members.forEach(({ name }, ordinal) => {
    values[name] = ordinal
  })
  return values
}

const BetState = extractEnumValues('UsingBetStorage', 'BetState')
const GameState = extractEnumValues('UsingGameStorage', 'GameState')

const buildMinResultMaxResultPairsFromOutcomeProbs = outcomeProbs => {
  const minResults = new Array(outcomeProbs.length)
  const maxResults = new Array(outcomeProbs.length)
  minResults[0] = BN_ZERO
  maxResults[0] = outcomeProbs[0].subn(1)
  for (let i = 1; i < outcomeProbs.length; i++) {
    minResults[i] = maxResults[i - 1].addn(1)
    maxResults[i] = maxResults[i - 1].add(outcomeProbs[i])
  }
  return zip(minResults, maxResults)
}

const calcBetHash = ({ token, stake, payout, prob, expiry, nonce }, bettingContract) =>
  ethUtil.bufferToHex(
    ethAbi.soliditySHA3(
      ...unzip(
        ['address', token],
        ['uint256', stake.toString()],
        ['uint256', payout.toString()],
        ['uint32', prob.toString()],
        ['uint256', expiry.toString()],
        ['uint256', nonce.toString()],
        ['address', bettingContract]
      )
    )
  )

const calcBetId = (owner, bet, bettingContract) => {
  const betHash = calcBetHash(bet, bettingContract)
  const betId = ethAbi.soliditySHA3(...unzip(['address', owner], ['bytes32', betHash]))
  return ethUtil.bufferToHex(betId)
}

const calcBetKey = (owner, bet, bettingContract) => {
  const betHash = calcBetHash(bet, bettingContract)
  const betId = ethAbi.soliditySHA3(...unzip(['address', owner], ['bytes32', betHash]))
  const betKey = ethAbi.soliditySHA3(...unzip(['address', owner], ['bytes32', betId]))
  return ethUtil.bufferToHex(betKey)
}

const buildMsgParams = (betContract, { token, stake, payout, prob, expiry, nonce }) => [
  { name: 'token', type: 'address', value: token },
  { name: 'stake', type: 'uint256', value: stake.toString() },
  { name: 'payout', type: 'uint256', value: payout.toString() },
  { name: 'prob', type: 'uint32', value: prob.toString() },
  { name: 'expiry', type: 'uint256', value: expiry.toString() },
  { name: 'nonce', type: 'uint256', value: nonce.toString() },
  { name: 'betContract', type: 'address', value: betContract }
]

const mnemonic = 'myth like bonus scare over problem client lizard pioneer submit female collect'
const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic))

// https://github.com/trufflesuite/truffle-hdwallet-provider/blob/master/index.js
const getPrivateKeyFor = hexAddress => {
  const address = ethUtil.toBuffer(hexAddress)
  for (let i = 0; i < 10; i++) {
    const wallet = hdwallet.derivePath(`m/44'/60'/0'/0/${i}`).getWallet()
    if (address.equals(wallet.getAddress())) {
      return wallet.getPrivateKey()
    }
  }
  throw new Error(`${address} wasn’t one of the first 10 generated addresses`)
}

contract('Exchange', accounts => {
  // const [, tokenOwner, bettingContractOwner, trustedRNGContractOwner, player2, player1] = accounts
  const [, tokenOwner, bettingContractOwner, trustedRNGContractOwner, player1_, player2_] = accounts
  let player1
  let player2
  if (Buffer.compare(toBuffer(player1_), toBuffer(player2_)) > 0) {
    player1 = player2_
    player2 = player1_
  }
  /*
   * These are the parameters for the bets. 2 players are going to bet against each other.
   * Player 1 is going to bet 3 COIN with 25% probability. If player 1 wins, he takes 12 coins.
   * Player 2 is going to bet 9 COIN with 75% probability. If player 2 wins, he takes 12 coins.
   */
  const stake1 = toTokenAmount(3, 18)
  const stake2 = toTokenAmount(9, 18)
  const randomNumberToGenerate = toBN(0x7fffffff)
  const outcomeProbs = [toBN(0x40000000), toBN(0xc0000000)]
  const prob1 = toBN(0x40000000) // 1/4 of 2 ** 32
  const prob2 = toBN(0xc0000000) // 3/4 of 2 ** 32
  // Both bets expire in 1 hour
  const now = toBN(Math.floor(Date.now() / 1000))
  const expiry1 = now.addn(3600)
  const expiry2 = now.addn(3600)
  it('complete end-to-end test', async () => {
    const trustedRNGFactoryContract = await TrustedRNGFactory.new({ from: trustedRNGContractOwner })
    const wethContract = await WrappedETHToken.new({ from: tokenOwner })
    const bettingContract = await Erc20BetExchange.new(
      trustedRNGFactoryContract.address,
      wethContract.address,
      {
        from: bettingContractOwner
      }
    )

    const trustedRNGContract = await TrustedRNG.at(await bettingContract.infoRNGAddress())

    // assert.equal(await trustedRngContract.owner(), trustedRNGContractOwner)
    // assert.equal(await bettingContract.storedRng(), trustedRngContract.address)
    const tokenContract = await CoinToken.new({ from: tokenOwner })
    const totalTokenSupply = await tokenContract.totalSupply()
    expect(totalTokenSupply).to.eq.BN(toTokenAmount(21000000, 18))
    expect(await tokenContract.balanceOf(tokenOwner)).to.eq.BN(totalTokenSupply)
    const balance1 = () => tokenContract.balanceOf(player1)
    const balance2 = () => tokenContract.balanceOf(player2)
    const allowance1 = () => tokenContract.allowance(player1, bettingContract.address)
    const allowance2 = () => tokenContract.allowance(player2, bettingContract.address)
    // Initially both players have zero coin balance,
    // and allow the casino to spend 0 coins.
    expect(await balance1()).to.eq.BN(BN_ZERO)
    expect(await balance2()).to.eq.BN(BN_ZERO)
    expect(await allowance1()).to.eq.BN(BN_ZERO)
    expect(await allowance2()).to.eq.BN(BN_ZERO)
    // We transfer to the players exactly the amount of money
    // they want to stake, so that they can gamble.
    await tokenContract.transfer(player1, stake1, { from: tokenOwner })
    await tokenContract.transfer(player2, stake2, { from: tokenOwner })
    expect(await balance1()).to.eq.BN(stake1)
    expect(await balance2()).to.eq.BN(stake2)
    expect(await allowance1()).to.eq.BN(BN_ZERO)
    expect(await allowance2()).to.eq.BN(BN_ZERO)
    // Each player approves the casino to transfer the stake from them.
    // The contract guarantees that this will only happen in the event that
    // each player's bets are matched and are going go be played fairly.
    await tokenContract.approve(bettingContract.address, stake1, { from: player1 })
    await tokenContract.approve(bettingContract.address, stake2, { from: player2 })
    expect(await balance1()).to.eq.BN(stake1)
    expect(await balance2()).to.eq.BN(stake2)
    expect(await allowance1()).to.eq.BN(stake1)
    expect(await allowance2()).to.eq.BN(stake2)

    const pot = stake1.add(stake2)
    const bet1 = {
      token: tokenContract.address,
      stake: stake1,
      payout: pot,
      prob: prob1,
      expiry: expiry1,
      nonce: BN_ZERO
    }
    const bet2 = {
      token: tokenContract.address,
      stake: stake2,
      payout: pot,
      prob: prob2,
      expiry: expiry2,
      nonce: BN_ZERO
    }

    // In the app, the user would click a button to sign a bet, and MetaMask would
    // prompt them for their signature. The signature gives the casino the permission
    // to transfer the tokens from them to the casino for the duration of the game
    // (until the Oracle calls back with a random number)
    // At the end of the game, the winner may withdraw funds.
    const sig1 = ethSigUtil.signTypedDataLegacy(getPrivateKeyFor(player1), {
      data: buildMsgParams(bettingContract.address, bet1)
    })
    const sig2 = ethSigUtil.signTypedDataLegacy(getPrivateKeyFor(player2), {
      data: buildMsgParams(bettingContract.address, bet2)
    })

    //   const recovered1 = toChecksumAddress(
    //     ethSigUtil.recoverTypedSignatureLegacy({
    //       data: buildMsgParams(bettingContract.address, bet1),
    //       sig: sig1
    //     })
    //   )
    //   const recovered2 = toChecksumAddress(
    //     ethSigUtil.recoverTypedSignatureLegacy({
    //       data: buildMsgParams(bettingContract.address, bet2),
    //       sig: sig2
    //     })
    //   )
    //   // These are just some sanity checks... move on...
    //   expect(recovered1).to.be.equal(player1)
    //   expect(recovered2).to.be.equal(player2)
    const { v: v1, r: r1, s: s1 } = ethUtil.fromRpcSig(sig1)
    const { v: v2, r: r2, s: s2 } = ethUtil.fromRpcSig(sig2)
    //   expect(
    //     await bettingContract.recoverBetOwner(
    //       bet1.token,
    //       bet1.stake,
    //       bet1.payout,
    //       bet1.prob,
    //       bet1.expiry,
    //       bet1.nonce,
    //       v1,
    //       ethUtil.bufferToHex(r1),
    //       ethUtil.bufferToHex(s1),
    //       { from: player1 }
    //     )
    //   ).to.be.true
    //   expect(
    //     await bettingContract.recoverBetOwner(
    //       bet2.token,
    //       bet2.stake,
    //       bet2.payout,
    //       bet2.prob,
    //       bet2.expiry,
    //       bet2.nonce,
    //       v2,
    //       ethUtil.bufferToHex(r2),
    //       ethUtil.bufferToHex(s2),
    //       { from: player2 }
    //     )
    //   ).to.be.true
    //   // These are just some sanity checks... move on...
    //   const key1 = calcBetKey(player1, bet1, bettingContract.address)
    //   const key2 = calcBetKey(player2, bet2, bettingContract.address)
    //   const key1Solidity = await bettingContract.calcBetKey(
    //     player1,
    //     bet1.token,
    //     bet1.stake,
    //     bet1.payout,
    //     bet1.prob,
    //     bet1.expiry,
    //     bet1.nonce
    //   )
    //   const key2Solidity = await bettingContract.calcBetKey(
    //     player2,
    //     bet2.token,
    //     bet2.stake,
    //     bet2.payout,
    //     bet2.prob,
    //     bet2.expiry,
    //     bet2.nonce
    //   )
    //   expect(key1).to.be.equal(key1Solidity)
    //   expect(key2).to.be.equal(key2Solidity)
    //   // These are just some sanity checks... move on...

    const customPackUint8ValuesInBytes32 = uint8Values =>
      bufferToHex(Buffer.from([uint8Values.length].concat(uint8Values))).padEnd(
        '0x'.length + 32 * '00'.length,
        '0'
      )

    const bets = [
      [
        player1,
        bet1.stake,
        bet1.payout,
        bet1.prob,
        bet1.expiry,
        bet1.nonce,
        v1,
        ethUtil.bufferToHex(r1),
        ethUtil.bufferToHex(s1),
        // '0x0100000000000000000000000000000000000000000000000000000000000000'
        customPackUint8ValuesInBytes32([0])
      ],
      [
        player2,
        bet2.stake,
        bet2.payout,
        bet2.prob,
        bet2.expiry,
        bet2.nonce,
        v2,
        ethUtil.bufferToHex(r2),
        ethUtil.bufferToHex(s2),
        // '0x0101000000000000000000000000000000000000000000000000000000000000'
        customPackUint8ValuesInBytes32([1])
      ]
    ]

    const key1 = calcBetId(player1, bet1, bettingContract.address)
    const key2 = calcBetId(player2, bet2, bettingContract.address)

    const getState = async (player, key) => {
      const { state } = await bettingContract.getBetInfo(key, { from: player })
      return state
    }

    // Here we confirm that the bets these user have signed have never been seen before on the blockchain.
    expect(await getState(player1, key1)).to.eq.BN(BetState.Unknown)
    expect(await getState(player2, key2)).to.eq.BN(BetState.Unknown)

    // And this is were the game is executed. The person executing this bet could be a website
    // that accepts signed bets from people over HTTP, and then if some bets match,
    // he will execute them on the platform.
    // During this transaction, the Contract does the most important part: it checks that all the
    // numbers add up, and will only succeed the transaction if they do.
    // If all the probabilities stakes and payouts add up, it is in this moment
    // that the casino contract pulls the stakes from the players, and keeps them
    // until one of them is declared a winner.
    const { receipt: executeGameReceipt } = await bettingContract.startGame(
      tokenContract.address,
      now.addn(3600),
      bets,
      outcomeProbs,
      { from: bettingContractOwner }
    )
    const { gasUsed: executeGameGasUsed } = executeGameReceipt
    console.log(`executeGameReceipt() consumed ${executeGameGasUsed} gas`)

    const info1 = await bettingContract.getBetInfo(key1, { from: player1 })
    const info2 = await bettingContract.getBetInfo(key2, { from: player2 })

    expect(info1.state).to.eq.BN(BetState.Matched)
    expect(info2.state).to.eq.BN(BetState.Matched)

    const allEvents = await getAllContractEventsForTx(
      [bettingContract, trustedRNGContract, tokenContract],
      executeGameReceipt
    )
    // We confirm that all logs outputted are as we expected them to be.
    const [, , , , { requestId: trustedRNGRequestId }, { gameId }] = expectLogsToBeEqual(
      allEvents,
      [
        ['Transfer', { from: player1, to: bettingContract.address, value: stake1 }],
        ['Transfer', { from: player2, to: bettingContract.address, value: stake2 }],
        [
          'BetMatched',
          { betOwner: player1, betId: key1, payout: bet1.payout, outcomeSubscripts: '0x00' }
        ],
        [
          'BetMatched',
          { betOwner: player2, betId: key2, payout: bet2.payout, outcomeSubscripts: '0x01' }
        ],
        ['TrustedRNGRequest'],
        ['GameStarted', { outcomeProbs }]
      ]
    )

    expect(info1.matchedGameId).to.eq.BN(gameId)
    expect(info2.matchedGameId).to.eq.BN(gameId)
    expect(trustedRNGRequestId).to.eq.BN(gameId)

    // Now we emulate the Random Number Generator (RNG)
    // calling back into betting contract, and we write the necessary information
    // to enable the winners to withdraw their payouts.
    const {
      receipt: triggerResponseResultReceipt
    } = await trustedRNGContract.handleTrustedRNGResponse(
      trustedRNGRequestId,
      randomNumberToGenerate,
      {
        from: trustedRNGContractOwner
      }
    )
    const { gasUsed: triggerResponseResultGasUsed } = triggerResponseResultReceipt
    console.log(`triggerResponseResult() consumed ${triggerResponseResultGasUsed} gas`)
    const rngCallbackEvents = await getAllContractEventsForTx(
      [bettingContract],
      triggerResponseResultReceipt
    )
    const [{ gameId: endedGameId }] = expectLogsToBeEqual(rngCallbackEvents, [['GameEndedOk']])

    expect(endedGameId).to.eq.BN(gameId)

    // const { root: ticketsMerkleRoot } = buildMerkleTree(ticketHashes)
    const endedGame = await bettingContract.storedGames(gameId)

    expect(endedGame.generatedRandomNumber).to.eq.BN(randomNumberToGenerate)
    expect(endedGame.state).to.eq.BN(GameState.RNGResponseReceived)
    expect(endedGame.token).to.be.equal(tokenContract.address)

    const minResultMaxResultPairs = buildMinResultMaxResultPairsFromOutcomeProbs(outcomeProbs)

    const tickets = flatten(
      allEvents
        .filter(({ event }) => event === 'BetMatched')
        .map(
          ({ args: { betId, betOwner, payout, outcomeSubscripts: outcomeSubscriptsAsBytes } }) => {
            const outcomeSubscripts = [...toBuffer(outcomeSubscriptsAsBytes)]
            return outcomeSubscripts.map(outcomeSubscript => {
              const [minResult, maxResult] = minResultMaxResultPairs[outcomeSubscript]
              return { player: betOwner, betId, minResult, maxResult, payout }
            })
          }
        )
    )

    const ticketHashes = await Promise.all(
      tickets.map(({ player, minResult, maxResult, payout }) =>
        bettingContract.computeTicketHash(player, minResult, maxResult, payout)
      )
    )

    const { root, proofs } = buildMerkleTree(ticketHashes)

    expect(root).to.be.equal(endedGame.ticketsMerkleRoot)

    const claims = zip(tickets, proofs).map(([ticket, proof]) => ({ ...ticket, proof }))

    const { generatedRandomNumber: n } = endedGame

    const isWinningTicket = ({ minResult, maxResult }) => minResult.lte(n) && n.lte(maxResult)

    const not = predicate => value => !predicate(value)

    const winners = claims.filter(isWinningTicket)
    const losers = claims.filter(not(isWinningTicket))

    // expect(storedGame).to.containSubset({
    //   generatedRandomNumber: n => randomNumberToGenerate.eq(n),
    //   state: state => state.eq(GameState.RNGResponseReceived),
    //   token: tokenContract.address
    //   // ticketsMerkleRoot
    // })
    //   const { generatedRandomNumber } = storedGame
    //   const { bets: txBets } = reconstructTicketsFromGameLogs(allEvents)
    //   const n = generatedRandomNumber

    // Every player tries to claim a win, but we confirm that who is entitled to the prize can actually withdraw, and
    // that the transaction fails if it is the loser who is trying to withdraw funds with a losing ticket.
    // Winning ticket(s) should be claimable using claim data,
    // trying to claim a losing ticket should fail.

    for (const { player, betId, minResult, maxResult, payout, proof } of winners) {
      const { receipt } = await bettingContract.claimBet(
        player,
        betId,
        minResult,
        maxResult,
        payout,
        proof
      )
      expectLogsToBeEqual(
        await getAllContractEventsForTx([bettingContract, tokenContract], receipt),
        [
          ['Transfer', { from: bettingContract.address, to: player, value: payout }],
          ['ClaimedWonBet', { player, betId, gameId: endedGameId }]
        ]
      )
    }

    for (const { player, betId, minResult, maxResult, payout, proof } of losers) {
      await expectRevert(
        bettingContract.claimBet(player, betId, minResult, maxResult, payout, proof),
        'REASON_TICKET_NOT_WINNING'
      )
    }

    // Finally, we make sure that the winner, player 2, now has all the funds!
    // We know that's it's player 2 who should be the winner, because we made up the random number
    // in our test RNG.
    const [b1, b2, a1, a2] = await Promise.all([balance1(), balance2(), allowance1(), allowance2()])
    expect(a1, 'allowance1').to.eq.BN(BN_ZERO)
    expect(a2, 'allowance2').to.eq.BN(BN_ZERO)
    expect(b1, 'balance1').to.eq.BN(BN_ZERO)
    expect(b2, 'balance2').to.eq.BN(pot)
  })
})
