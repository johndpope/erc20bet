## Testing: Speed and reliability considerations

From [Truffle docs: Testing your contracts: Speed and reliability considerations](https://truffleframework.com/docs/truffle/testing/testing-your-contracts#speed-and-reliability-considerations):

> Both Ganache and Truffle Develop are significantly faster than other clients when running automated tests. Moreover, they contain special features which Truffle takes advantage of to speed up test runtime by almost 90%. As a general workflow, we recommend you use Ganache or Truffle Develop during normal development and testing, and then run your tests once against go-ethereum or another official Ethereum client when you're gearing up to deploy to live or production networks.



## Events

From [Library Driven Development in Solidity](https://blog.aragon.org/library-driven-development-in-solidity-2bebcaf88736/):

> Only problem is, as of right now, the contract ABI does not reflect the events that the libraries it uses may emit. This confuses clients such as web3, that won't be able to decode what event was called or figure out how to decode its arguments.
>
> There is a quick hack for this, defining the event both in the contract and the library will trick clients into thinking that it was actually the main contract who sent the event and not the library.

# Oraclize Ethereum bridge

npm install -g ethereum-bridge
ethereum-bridge --account 9 --dev

# Git

|What|How|Link|
|-|-|-|
Delete a branch|`git branch -d the_local_branch`|[link](https://makandracards.com/makandra/621-git-delete-a-branch-local-or-remote)
Break a previous commit into multiple commits|`git reset HEAD~`|[link](https://stackoverflow.com/questions/6217156/break-a-previous-commit-into-multiple-commits)




    HD Wallet
    ==================
    Mnemonic:      myth like bonus scare over problem client lizard pioneer submit female collect
    Base HD Path:  m/44'/60'/0'/0/{account_index}
