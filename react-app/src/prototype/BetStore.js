import { observable } from 'mobx'

/*

Let's take all bets that we have, and show them in the display, organized by token, then by game.

Once bets are locally in our client, we watch blockchain for updates.

Button: "Remove bets that aren’t mine"

Button: "Pull" bets from server

In the "New game", they will have a checkbox, and you can select multi. Every combination you try, it will try and execute it locally
and estimate gas, and show you winnings, etc.

For now UI allows only simple matches, one outcome per bet. But contract supports more complex bets, of course.

We watch all Transfer/Approval events *from now onwards*, to keep UI up to date.

We watch all Contract events (games, tickets, etc.) without missing a beat, because we need to build state from logs!




*/

class PlayerStore {}

class TokenStore {}

// prettier-ignore
const BetState = {
  OffCreated:        0b00000001,
  OffServer:         0b00000010,
  OnPlaced:          0b11000000,
  OnMatched:         0b10100000,
  OnClosedCancelled: 0b10011000,
  OnClosedError:     0b10010100,
  OnClosedLost:      0b10010010,
  OnClosedWon:       0b10010001,
}

export default class BetStore {
  @observable
  tokenStore

  @observable
  stake

  @observable
  payout

  @observable
  prob

  @observable
  expiry

  @observable
  nonce

  @computed
  get id() {
    return bufferToHex(soliditySha3(...this._params.map(({ type, value }) => ({ type, value }))))
  }

  constructor({
    playerStore,
    tokenStore,
    contractStore,
    details: { stake, payout, prob, expiry, nonce },
    id,
    state = BetState.OffCreated
  }) {
    this.playerStore = playerStore
    this.tokenStore = tokenStore
    this.contractStore = contractStore
    // if id only, ok
    // if details only, calculate id
    // if both id and details, ensure it matches this.id (that is calculated from others)
    // otherwise error
    this.details = { stake, payout, prob, expiry, nonce }
    this.id = id
    // this.state = state
  }

  // @computed
  // get state() {}
}
