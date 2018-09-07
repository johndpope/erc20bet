Design pattern decisions
========================

* An important design pattern adopted in the contract is to minimize the amount of contract storage used, and make use of logs for data that is required off-chain but not on-chain.

* We employ the withdrawal pattern for winners to claim their payouts, so as to limit the gas usage as we loop through the winners when the RNG calls back into the contract.

* To save storage, we store the information needed for payments in a Merkle tree, and just store the Merkle root on-chain.

* The contract makes use of a Random Number Generator (RNG), and it uses Oraclize's [Random Data Source](https://docs.oraclize.it/#ethereum-advanced-topics-random-data-source). But on the development blockchain it is not possible to use this data source, so we have abstracted the behaviour of the RNG in an abstract class so that we can have a live-implementation (Oraclize) and a test-implementation (TrustedRng.sol). This pattern also makes it easier to test, as can be seen in the tests section.


Selectively restricting access to bet info without explicity storing owner
--------------------------------------------------------------------------

We employ a trick to achieve this.

Storage is expensive, but calculating `keccak256` hash is not so much.

The `betId` is not used directly as the key in the mapping `storedBetInfos`.

Instead, as the key we use `keccak256(abi.encodePacked(player, betId))`

When we want anyone to access a location, we allow `player` to be specified, e.g.

```solidity
function getStoredBetInfo(address player, bytes32 betId) returns (StoredBetInfo) {
    bytes32 betKey = keccak256(abi.encodePacked(player, betId));
    return storedBetInfos[betKey];
}
```

On the other hand, when we want access to be restricted, we use `msg.sender` directly:

```solidity
function cancelUnmatchedBet(bytes32 betId) public {
    bytes32 betKey = keccak256(abi.encodePacked(msg.sender, betId));
    require(storedBetStates[betKey] == BetState.PlacedNotMatched, "Only placed and unmatched bets can be cancelled");
    storedBetStates[betKey] = BetState.Closed;
    emit BetCancelled(msg.sender, betId);
}
```

This achieves the desired effect because:
1. There is no way to set `msg.sender` other than to the address that is signing the current transaction, and
2. There is no computationally-feasible way to work backwards the betId for a given msg.sender



Contract hierarchy
------------------

Exchange contract contains all logic, using structs.

ExchangeExternal extends Exchange, and adapt the functions in Exchange to work around the current ABI v1 limitations.

This separation of concerns declutters the main contract, rendering it easier to comprehend.


More
----

As much as possible, we try to pass what we can from the outside, e.g. we could find the minimum expiry of all bets, and set automatically
the game expiry to that.
But instead, we pass it explicitly from outside, and internally check.
The pattern here is that as much as possible, we try to leave
the contract as configurable as possible, and be as least opinionated as possible.

Cannot withdraw tokens from contract.


We prefix "stored" to make it clear that we are reading/writing from/to storage.
