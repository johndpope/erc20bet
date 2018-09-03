Design pattern decisions
========================

* An important design pattern adopted in the contract is to minimize the amount of contract storage used, and make use of logs for data that is required off-chain but not on-chain.

* We employ the withdrawal pattern for winners to claim their payouts, so as to limit the gas usage as we loop through the winners when the RNG calls back into the contract.

* To save storage, we store the information needed for payments in a Merkle tree, and just store the Merkle root on-chain.

* The contract makes use of a Random Number Generator (RNG), and it uses Oraclize's [Random Data Source](https://docs.oraclize.it/#ethereum-advanced-topics-random-data-source). But on the development blockchain it is not possible to use this data source, so we have abstracted the behaviour of the RNG in an abstract class so that we can have a live-implementation (Oraclize) and a test-implementation (TrustedRng.sol). This pattern also makes it easier to test, as can be seen in the tests section.
