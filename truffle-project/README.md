ERC⑳BET — A decentralized ERC-20 token betting exchange
========================================================

This document is being submitted by Edward Grech in fulfilment of the ConsenSys Academy’s 2018 Developer Program Final Project. The author reserves the rights to all the code and documentation being submitted as part of this project.

Overview
--------

ERC20BET is a platform that allows two or more players to bet amounts of an ERC-20 token against each other in a [game of pure chance](https://en.wikipedia.org/wiki/Game_of_chance).

> Let us illustrate the type of game that can be played on ERC20BET with a basic example. Suppose that a player A is willing to stake 1 LuckyToken to participate in a game of pure chance in which a coin is flipped randomly with a 50% chance of landing on one side or the other, and depending on the outcome of the coin-flip, either A loses the 1 LuckyToken (ending up with 0 LuckyToken), or he wins another 1 LuckyToken (ending up with 2 LuckyToken.) Suppose that another player B is also willing to place a similar bet. In such a scenario, it is possible to match player A’s bet with B’s, as one player’s loss will be the other player’s winning, regardless of the outcome of the coin-flip. The primary function of the ERC20BET smart contract is to be able of accepting such groups of matched bets, verify that the numbers all add up, and only if they do, then execute a fair game in which one of the players is selected randomly in accordance with the agreed probabilities, and finally allow for the funds to be transferred from loser to winner.

The sum of stakes of all the players in a game is referred to as the _pot_, and as long as the pot pays for the the winnings in any possible outcome of the game, then there is no limit to how many bets can be matched in a single game. (The only limits will be imposed by the per-block upper gas-limit imposed by the EVM itself, which means that the more frugal we are with gas consumption, the more bets we can match to each other in a single game!)

The following are the key properties of the ERC20BET system:

* It supports bets in any ERC-20 token.
* Bets may be placed either directly on-chain or off-chain
* The contract does not impose any rent or usage tax, other than the  ETH gas that is necessary to cover the Ethereum transaction cost and calls to the Oraclize Random Number Generator (RNG)
* The contract does not impose any fee schedule or “vig.” A player is free to set the terms of his bet, and -ve, zero, +ve edges are all supported.
* Bets have an expiry timestamp, which is the latest time at which the bet can be matched.
* Once a bet is matched, all information required to claim the bet is available from the blockchain (combination of contract storage and logs)
* The contract owner has no control over funds, and it gives no special rights to a person who _executes_ a game. If a user wants to profit, he needs to play in his own game, so to speak.


User stories
------------

We describe the system from the user’s point of view first in this section, and then go into the implementation specifics in a later section.

However keep in mind that the user interface is a work in progress, as more focus was put into the smart contract at this stage, and I have ticked as ✔️ the stories that are complete and functional in the user interface. On the other hand, from the smart-contract side, all the functionality listed above is implemented and tested, as we will see further on in the Tests section.

* A player opens the web app. The web app reads the address and loads a set of bets that were previously saved to local storage, that could or could not be his bets. The bets are displayed to the user grouped by ERC-20 token.

* If the app is running locally in dev mode, there should be a toy ERC-20 token that will allow the user to explore the app. ✔️

* For each token grouping, the web app displays:
  1. The player’s token balance ✔️
  2. The amount of tokens that the player has approved the Contract to spend. ✔️

  As long as the web app is open, these two values are kept in sync with the blockchain, so if these values change from *outside* the web app, the values should update in the interface. ✔️

* The app should allow the player to modify the approval amount. ✔️

* The app should provide a simple demonstration token for the purpose of exploring the system easily.

* The app should allow the player to easily switch between different accounts in order to evaluate the system easily.

* The app allows the player to create a new bet with arbitrary parameters. Any amount of any ERC-20 token may be staked, and the edge above, equal, or below a fair bet is to be decided by the player. ✔️

* The app allows the player to sign a bet with his private Ethereum key. The app must communicate the terms for which he is signing as clearly as possible, using the most recent features of MetaMask.

* The app allows the player to export a bet to a text string that he may communicate easily over a communications channel, and inversely import a bet from a text string that he may have received.

* The app should keep the user up to date with the status of a bet, whether it was matched, it won, it lost, etc.

* The app should allow the player to match a group of bets together in the interface, and submit these to the blockchain as a _game_. The app should then keep the player up to date with the status of the game as it goes through the different stages.

* It should be possible to cancel a bet.

* It should be possible to place a bet directly into the blockchain.

* Although the Contract is targetted towards being used by people, it should also be usable from another contract (this mainly concerns providing the use of signatures.)

* The Contract should support simple ways of upgrading the RNG if necessary.

* The Contract should be designed in a way that it consumes as little gas as possible, so as to ensure that transactions go through every time.

* The Contract should disallow from a player betting against himself, to protect against the case that the bet has two bets that are signed.


## 🔧 Setting up the dev environment

The contracts and the front-end client are separated into two separate directories:

```
├── truffle-project
└── react-app
```

Each of these two is an npm project with its own dependencies, so you must `npm install` each, as per the instructions that follow.

> I have found keeping these separate components in their own npm environment to simplify the development process. It is particulary simple to set up especially since the only data shared by the two projects are the contract build artifacts, which are shared with the React app through a symlink.
>
> ```
> ├─┬ truffle-project
> │ └─┬ build
> |   └── contracts
> └─┬ react-app
>   └─┬ src
>     └─┬ truffle-project-build -> ../../truffle-project/build 
>       └── contracts
> ```

The system needs nodejs v10 to be installed in order to run. It may be installed via [nvm](https://github.com/creationix/nvm) as follows:

```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
nvm install v10
nvm use v10
```

### 🍬 Truffle project — Contracts

```bash
cd truffle-project
npm install
```

This will install all npm packages in the local node environment. Note that the project uses Truffle v5 beta, but it should not cause any issues as it is installed into the project, so it does not matter if on the same system there is Truffle v4 installed globally. Next run:

```bash
npm run ganache-cli
```

This will run the ganache-cli Ethereum development node on http://localhost:8545, so please ensure that this port is kept free.

> Note is that [internally](./package.json) `ganache-cli` is run with the `--deterministic` option, which means that every time it runs we are assigned the same seed phrase, which can be imported into MetaMask once and for all.

Now that ganache-cli is running, open another shell in `truffle-project`. The contracts are in the `contracts` directory and the tests are in `test`. To compile/migrate/test, run:

* `npm run compile`
* `npm run migrate`
* `npm test`

These npm scripts are defined in package.json, and the reason we run these commands through these scripts is so that we run the local Truffle v5.

### ⚛️ React app — User interface

Now that the ganache-cli server is running on http://localhost:8545 and the contracts are deployed, we can run the frontend.

Go back to the root of the project, and run:

```bash
cd react-app
npm install
npm run start
```

This will serve the front-end HTML interface at http://localhost:3000

### 🦊 MetaMask

We have the Ethereum node running, the front-end loaded, but now we need to bridge the two with MetaMask.

The application has been tested with MetaMask v4.9.3. In case that MetaMask upgrades, kindly install v4.9.3 as an “unpacked” Chrome extension direcly from [here](https://github.com/MetaMask/metamask-extension/releases).

This may or may not be important as the app uses [a feature of MetaMask](https://github.com/MetaMask/metamask-extension/issues/4752) that is going to be deprecated.

https://medium.com/metamask/scaling-web3-with-signtypeddata-91d6efc8b290
https://github.com/ethereum/EIPs/pull/712

Import the following mnemonic seed phrase into MetaMask, and create a password of your choice:

```
myth like bonus scare over problem client lizard pioneer submit female collect
```

If you have used this mnemonic before, it is avdisable to “Reset account” before starting.

In addition to the default “Account 1”, you might want to create an extra “Account 2”, which we will use later to simulate a second player. In the “My Accounts” dropdown menu, select “Create Account”, accept the defaults, and click “Create.”

Switch the network to Localhost 8545 private network.

## A walk through the current app interface 🚶 

After having completed the above steps, the app interface may be loaded by navigating to http://localhost:8545

You will immediately notice that although we are on a development blockchain, there are already two tokens loaded, and in one of them we even might have some balance! These two tokens come prepackaged with ERC20BET specifically for demonstration purposes.

The block number keeps up to date, and the current user Ethereum address is shown.

### CoinToken

This is [a standard ERC-20 token](./contracts/tokens/CoinToken.sol) with 18 decimals with an initial allotment of 21,000,000 COIN (equal to 21000000e+18 base units) to the creator of the token, which happens to be “Account 1”, which is why you should note that you have a balance if you switch to “Account 1.”

Now let’s perform a transaction. First we’ll register CoinToken with MetaMask. Click on the token address in the Interface to copy it to the clipboard. As CoinToken is an ERC-20 compliant token, we may add it to MetaMask via “Add Token.” Select “Custom Token” and in “Token Address” paste the token contract address that we have copied. Once you do this, the “Token Symbol” and “Decimals of Precision” fields should be automatically populated correctly. Such is the beauty of standards! You should also note that the token balance in MetaMask agrees with the balance displayed in the app.

Fantastic. Now we will send some COIN to “Address 2”, and we will observe the changes. Make sure you are logged in as “Account 1.” Send 100 COIN to “Address 2”, and the app should show the updated balance.

If you switch to “Address 2”, you should notice that you have 100 COIN. I congratulate you.

### BeerToken

What makes this token special is that there isn’t an initial allotment of beers to some account. Instead, anyone may claim 10 free beers at a go by sending a zero-value (0 ETH) transaction to the deployed BeerToken contract. What this means is that we can claim our beers through MetaMask alone. Go on, claim your free beers!

What is also interesting about BeerToken is that as far as the token contract is concerned, a beer is undivisable, i.e. the `decimals` variable of the ERC-20 token contract is set to 0. Apart from the fact that nobody wants half a beer, this property of BeerToken makes it easy for us to reason about the betting process (and also helps us work around some limitations with how MetaMask renders token amounts when we are signing a transaction without sending it.)


### Tests

Tests are found under `/tests`.

* `test/tokens` contain self-explanatory tests to ensure the tokens we use to test the system are themselves functioning correctly.
* `test/merkle` contains tests for a library I have implemented that is used in the contract.
* The most important test is [`test/Erc20BetExchange.test.js`](./test/Erc20BetExchange.test.js). It takes us through the whole flow of the contract's operation, and is the best documentation for how the contract works.

To run all tests execute `npm test`

### 📐 Design pattern decisions

Kindly refer to the [Design Pattern Decision](./design_pattern_decisions.md) document for details.

### 🔒 Smart contract security considerations

Kindly refer to the [Avoiding common attacks](./avoiding_common_attacks.md) document for details.

### 📚 Libraries

The ERC20BET codebase makes use of a number of Solidity libraries. All the libraries used are compiled with the code, i.e. they are not deployed as stand-alone libraries on the blockchain and then linked.

### Libraries used

* OpenZeppelin — SafeMath functions, base ERC-20 token implementations.
* Oraclize — The Oraclize API is not a `library` in the Solidity sense, but it is a base contract that is extended by our OraclizeRNG implementation of the RNG base contract.

### Libraries developed

* [MerkleTree](./contracts/lib/merkle/MerkleTree.sol) — A library for calulating the root of a Merkle-tree _on chain_. The openzeppelin-solidity library already includes a [`verifyProof`](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/MerkleProof.sol) function for verifying a Merkle-proof against a root that has been calculated off-chain, which is itself used by ourselves in the `claimBetPayout` function on the main contract. This library complements this function with an on-chain `computeMerkleRoot` function. The author is currently preparing a PR for this function to be included into the openzeppelin-solidity library. The library is complemented by [a JavaScript helper libary](./helpers/merkle-trees.js) to assist testing.

* [Signatures](./contracts/lib/Signatures.sol) — This is a small library that is concerned with validating ECDSA signatures. It is used by Erc20BettingExchange to assist in validating the signatures of bets that have been signed off-chain.

### EthPM

No libraries from EthPM were used, because installing OpenZeppelin from npm and Oraclize by including the files offers a superior developer experience.


📜 Contract architecture
------------------------

The core behaviour of ERC20BET is defined in two Solidity contracts:

* [Erc20BetExchange.sol](./contracts/Erc20BetExchange.sol)
* [RNG.sol](./contracts/rng/Rng.sol)

Erc20BetExchange.sol defines the main contract with which players and matchers interact. It takes care of verifying the betting arithmetic is correct, and takes care of transferring funds between the players and the contract and back.

The following diagram shows how the contracts interact with each other and with the off-chain world.

![System Architecture](https://docs.google.com/drawings/d/e/2PACX-1vSJD6IjjPMBvQ5dpnzBpSuXK560HLS_faz-T_t56eGtDqzOs0Xj-hgjIdjA0kWQSILOAhjxYkqLZ5MS/pub?w=1289&h=729)

For the exact API, refer to the contract source code itself, but below we list a summary of the primary functions exposed by the contract:

|Function name|Purpose|
|-|-|-|-|
|placeBet|Called to place a bet directly on-chain
|cancelUnmatchedBet|Called to cancel a yet-unmatched, or even yet-unplaced, bet
|openGame|Called by the matcher to execute a match and open a game, which will be closed in a future transaction when the RNG calls back with the generated random number, or it times out.|
|onRngResponseResult|Called by the RNG to close a game with generated random number.|
|onRngResponseError|Called by the RNG to close a game with an error
|claimWonBet|Called to transfer the token payout of a winning bet into the winner’s ERC-20 token account.|

Detailed notes about the implementation of these functions are to be found in the .sol file in the NatSpec documentation and in the comments.

RNG.sol is an abstract contract defining the services of a Random Number Generator from the point of view of the betting contract:

* It is decoupled from the betting contract so that the betting contract can focus on the gambling arithmetic and payments without worrying about RNG, and use RNG as a service
* It is abstract so that it can be concerned with the higher-level behaviour and constraints of how an RNG should work, without defining the actual implementation. This allows the concrete contracts extending the RNG contract to focus on the specific RNG implementation. It allows us to implement different RNG implementations for different scenarios. E.g. in our codebase, we implement 2 RNG implementations:
  - OraclizeRNG
  - TrustedRNG, which we use for testing
