Avoiding common attacks
=======================

This documents explains what measures have been taken to ensure that the contracts are not susceptible to common attacks.

The nature of the contract makes it robust to certain attacks, as every game runs independently of the others, so it would be difficult to get the contract to be “stuck” in an invalid state.

Since the contract is called from outside the blockchain, certain errors can be avoided by controlling the input, e.g. not passing so many bets that the gas block limit is exceeded.

Common attacks
--------------

### Transaction-Ordering Dependence (TOD) / Front Running

>[Be aware of front running attacks on EIP-20](https://consensys.github.io/smart-contract-best-practices/tokens/#be-aware-of-front-running-attacks-on-eip-20)
>
>The EIP-20 token's approve() function creates the potential for an approved spender to spend more than the intended amount. A front running attack can be used, enabling an approved spender to call transferFrom() both before and after the call to approve() is processed. More details are available on the EIP, and in this document.

This is not an issue for our system, as the Contract can only transfer funds to itself if the user has signed a bet.

### Timestamp Dependence

The `block.timestamp` is used in two instances in the ERC20BET smart contract.

#### ⌛ Expiration of a bet

Once to check the validity of a bet to see whether it is expired — if not, it cannot be matched. The consequence of this is that a bet is approaching expiry, there will be a short time window in which a miner could voluntarily choose a timestamp that invalidates a bet. Invalidating a single bet will invalidate the whole transaction. So the worst case is that a miner maliciously spoils our match if it happens to contain “late bets.” The risk of this happening can be avoided if:

* Players allow a reasonable amount of time for the bet to be matched
* Matchers do not wait until the last minute to match a bet. There is an advantage to the miner from doing this, as the longer he takes to match bets, he might be able to combine them in a more profitable manner. So he would have to strike a balance. The thing will auto-regulate itself.

### Integer Overflow and/or Underflow

SafeMath.

Sometimes SafeMath is avoidable, as we might have already checked. However, we use it consistently for all arithmetic operations, as we believe that the minimal gas gain might not be worth a flaw.

An exception are loop iterators.

We make a distinction between when a value is coming from outside, passed by the caller, or when it is a value we create ourselves. E.g. if we start counting from uint256 i = 0, we don't need to worry about it reaching the maximum value — not gonna happen. But if a value is coming from outside, we cannot trust it, as it might be passed near to the uint256 limit purposely (“poison data”.)

In addition we use `uint256` instead of just `uint` so that it is more explicit. As much as possible, we use uint256 in all contracts, even if certain variables do not really require such a large storage capacity. This takes out one complexity out of the equation.

### DoS with (Unexpected) revert

If the `transfer()` function of an ERC-20 token is malicious, it will crash our for loop as we go through the list of players to transfer funds.

On the plus side, the ERC20BET contract is not susceptbile to attacks a la KingOfTheEther, as the contract is more akin to a “service”, in that games do not interact with each other.

We implement a pull-payment system for withdrawals, so this is not an issue during withdrawals. Nobody can e.g. attack the contract such that nobody else can withdraw funds.

### Forcibly Sending Ether to a Contract

Since the ERC20BET contract does not maintain user ETH balances, it is not prone to this attack.

As far as ETH is concerned, we implement a non-payable fallback function, in order to reject any payments that are sent to the contract. Also, we provide a means to withdraw ETH funds that might still end up in the contract (by being foricbly sent), so that they are not wasted :)

### Cross-Chain Replay Attacks

[link](http://hackingdistributed.com/2016/07/17/cross-chain-replay/)

We avoid such attacks by encoding the betting contract address into the bet hash.

### Solidity Function Signatures and Fallback Data Collisions

[Read more](https://www.kingoftheether.com/contract-safety-checklist.html) about this.

### Incorrect use of cryptography

This is relevant to our contract as we are using certain features. Before the contract went live with real money, we would have to audit well by a cryptography expert.

### Token specific attacks

#### Prevent transferring tokens to the 0x0 address

A player cannot be 0x0 because he would have to have signed the transaction for us to process the bet.

#### Prevent transferring tokens to the contract address

The risk here is to have tokens ending up stuck at the contract address.

We do this, but _by design_. It is important that tokens are temporarily shifted to the contract between the time a game is opened until it is closed. Giving access to these funds would compromise the trust of the exchange.

### Other

* `tx.origin` is not used
* `msg.transfer` - or could we use 'call' to leave it open?


Security through coding style
-----------------------------

### Following standards and best practices.

We also make it explicit that a variable is in storage by prefixing it `stored`, e.g. `storedGames`. Despite the convention of naming variables with an underscore, I personally find these ugly, and with `stored` things are more explicit.

If a certain function has many parameters, we use the named-parameters calling approach, as this can minimize unintended erros from swapping the position of values.

We enable `pragma experimental "v0.5.0";` as this can help us prevent certain errors. Elaborate.

We use solium as a linter, and avoid implementing project-wide disables, but rather write them always locally so that they stick out like a sore thumb.

### Poison data

One technique we apply, which is used, but not as common, is to avoid a user passing e.g. his own address. What we can deduce from the `msg` context, we do.
