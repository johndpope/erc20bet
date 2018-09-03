import { observer } from 'mobx-react'
import DevTools from 'mobx-react-devtools'
import React from 'react'
import './App.css'
import Bet from './Bet'
import { Blockchain } from './Blockchain'
import Token from './Token'

@observer
export default class App extends React.Component {
  render() {
    const { appStore } = this.props
    const { blockchainStore, tokenViewStores, betStores } = appStore

    const tokenStore = [...blockchainStore.tokens][0][1]

    return (
      <article className="box App">
        <header>
          Erc
          <span className="wooden-bingo-chip">20</span>
          .bet
        </header>
        <main>
          <Blockchain appStore={appStore} blockchainStore={blockchainStore} />

          {/* <div className="box">
            <header>Tokens</header>
            <main>
              {tokenViewStores.map(tokenViewStore => {
                const { tokenStore, gameViewStores } = tokenViewStore
                return (
                  <section className="box">
                    <header>{tokenStore.name || '?'} games</header>
                    <main>
                      <Token key={tokenStore.address} store={tokenStore} />
                      <ul>
                        {gameViewStores.map(({ gameStore }) => (
                          <li>Game {gameStore.id}</li>
                        ))}
                      </ul>
                    </main>
                  </section>
                )
              })}
            </main>
          </div> */}

          <div className="box">
            <header>Bets</header>
            <main>
              {betStores.map(betStore => (
                <Bet
                  key={betStore.nonce}
                  blockchainStore={blockchainStore}
                  betStore={betStore}
                  tokenStore={tokenStore}
                  // onValueChange={this.onBetValueChange}
                  // readOnly
                />
              ))}
            </main>
          </div>
        </main>
        <DevTools />
      </article>
    )
  }
}

// /**
//  * Notes
//  * =====
//  *
//  * We need to keep track of until which block number we are up to date about.
//  *
//  */
// class App extends Component {
//   constructor(props) {
//     super(props)
//     this.state = {
//       tokens: [
//         {
//           address: '0xc045c7b6b976d24728872d2117073c893d0b09c2',
//           details: {
//             name: 'BeerToken',
//             symbol: '🍺',
//             decimals: 0
//           }
//         }
//       ],
//       dummy: null,
//       dummyValue: null,
//       dummyAddress: null,
//       isDummyValueLoading: false,
//       bettingContract: null,
//       betAddress: null,
//       account: null,

//       // Warning: `value` prop on `select` should not be null.
//       // Consider using an empty string to clear the component
//       // or `undefined` for uncontrolled components.
//       currentToken: undefined,
//       tokens: [],

//       bet: {
//         stake: toTokenAmount(1000, 2),
//         payout: toTokenAmount(2000, 2),
//         prob: toBigNumber(0x80000000),
//         expiry: toBigNumber(Math.floor(Date.now() / 1000) + 600),
//         nonce: toBigNumber(randomBytes32Hex())
//       },
//       bets: [],
//       server: null,
//       beerTokenContract: null
//     }
//     this.handleClick = this.handleClick.bind(this)
//     this.handleSelectedTokenChange = this.handleSelectedTokenAddressChange.bind(this)
//     this.testSignAndPut = this.testSignAndPut.bind(this)
//     this.onBetValueChange = this.onBetValueChange.bind(this)
//     this.onBetDelete = this.onBetDelete.bind(this)

//     this.handleTokenDetailsUpdated = this.handleTokenDetailsUpdated.bind(this)
//     this.handleClaimFreeBeer = this.handleClaimFreeBeer.bind(this)
//   }

//   onTokenTransfer(address, err, event) {}
//   onTokenApproval(address, err, event) {}

//   async componentDidMount() {
//     // let metamaskWeb3Provider

//     // // See https://github.com/MetaMask/faq/blob/master/detecting_metamask.md#detecting-metamask
//     // if (typeof window.web3 !== 'undefined') {
//     //   const currentProvider = window.web3.currentProvider
//     //   if (currentProvider.isMetaMask) {
//     //     metamaskWeb3Provider = currentProvider
//     //   } else {
//     //     throw new Error('Was expecting MetaMask to be detected')
//     //   }
//     // } else {
//     //   throw new Error('Was expecting MetaMask to be detected')
//     // }

//     // console.log('!')
//     // const web3 = new Web3(metamaskWeb3Provider)

//     // window.Web3 = Web3

//     const web3 = this.props.web3
//     const account = this.props.account

//     window.truffleContract = truffleContract

//     this.setState({ account: account })

//     const artifacts = [Electrobet, Dummy, SillyToken, SillyToken2, BeerToken]
//     const contracts = artifacts.map(artifact => truffleContract(artifact))
//     for (const contract of contracts) {
//       contract.setProvider(web3.currentProvider)
//       contract.defaults({ from: account })
//     }

//     const [
//       bettingContract,
//       dummy,
//       sillyTokenContract,
//       sillyToken2Contract,
//       beerTokenContract
//     ] = await Promise.all(contracts.map(contract => contract.deployed()))

//     const bettingContractAddress = bettingContract.address

//     const playerAddress = account

//     const tokenContracts = [beerTokenContract, sillyTokenContract, sillyToken2Contract]

//     const blockchain = new Blockchain({
//       bettingContractAddress,
//       playerAddress
//     })

//     const tokenHelpers = fromKeyValuePairs(
//       [beerTokenContract, sillyTokenContract, sillyToken2Contract].map(contract => ({
//         k: contract.address,
//         v: new TokenHelper({
//           tokenContract: contract,
//           bettingContractAddress,
//           playerAddress,
//           onTransfer: (err, event) => this.onTokenTransfer(contract.address, err, event),
//           onApproval: (err, event) => this.onTokenApproval(contract.address, err, event)
//         })
//       }))
//     )

//     const [{ address: selectedTokenAddress }] = tokens

//     const server = new Server(
//       'http://localhost:3100',
//       web3.currentProvider,
//       bettingContract.address,
//       account
//     )

//     const bets = await server.getBets()

//     this.setState({
//       dummy: dummy,
//       dummyValue: '' + (await dummy.getDummyValue()),
//       dummyAddress: dummy.address,
//       isDummyValueLoading: false,
//       bettingContract: bettingContract,
//       betAddress: bettingContract.address,
//       isChecked: true,

//       tokens,
//       selectedTokenAddress,

//       beerTokenContract,
//       server,
//       bets
//     })

//     dummy.DummyValueUpdated().watch((err, event) => {
//       if (err) {
//         console.log(`Żball: ${err}`)
//       } else {
//         console.log({ event })
//         this.setState({
//           dummyValue: '' + event.args.newDummyValue,
//           isDummyValueLoading: false
//         })
//       }
//     })
//   }

//   async handleClick(event) {
//     this.setState({
//       isDummyValueLoading: true
//     })
//     const { dummy } = this.state
//     let tx
//     try {
//       tx = await dummy.incDummyValue()
//     } catch (e) {
//       console.log(`Żball: ${e}`)
//     }
//     console.log(tx)
//   }

//   handleSelectedTokenAddressChange(event) {
//     // this.setState({ selectedToken: event.target.value })
//   }

//   async handleClaimFreeBeer(amount) {
//     const { beerTokenContract } = this.state
//     const receipt = await beerTokenContract.claimFreeBeer(amount)
//     console.log('receipt = %o', receipt)
//   }

//   // https://medium.com/metamask/scaling-web3-with-signtypeddata-91d6efc8b290
//   // https://github.com/ethereum/EIPs/pull/712
//   async testSignAndPut() {
//     const { selectedToken: tokenContractAddress, bet, server } = this.state
//     const { stake, payout, prob, expiry, nonce } = bet
//     await server.putBet({ tokenContractAddress, stake, payout, prob, expiry, nonce })
//   }

//   onBetValueChange(values) {
//     console.log(values)
//     this.setState({ bet: values })
//   }

//   async onBetDelete(betId) {
//     console.log(`Deleting bet ${betId} from server…`)
//     const { server } = this.state
//     try {
//       await server.deleteBet(betId)
//     } catch (err) {
//       throw err
//     }
//     console.log(`Successfully deleted bet ${betId} from server.`)
//     console.log('Updating bets…')
//     // Here we could just delete bet from local list, but then we might have
//     // to think about what happens if e.g. responses are received out of order, etc.
//     // Instead we make extra request to get the fresh list of bets.
//     let bets
//     try {
//       bets = await server.getBets()
//     } catch (err) {
//       throw err
//     }
//     if (bets) {
//       this.setState({ bets })
//       console.log('Updated bets.')
//     }
//   }

//   handleTokenDetailsUpdated(address, { name, symbol, decimals }) {
//     const { tokens } = this.state
//     const index = tokens.findIndex(token => token.address === address)
//     const tokensCopy = [...tokens]
//     tokensCopy[index] = { ...tokensCopy[index], name, symbol, decimals }
//     this.setState({ tokens: tokensCopy })
//   }

//   render() {
//     const { web3, account } = this.props
//     const { isChecked, bet, bets, selectedTokenAddress, tokens, bettingContract } = this.state
//     return (
//       <div className="App">
//         <header className="App-header">
//           <h1 className="App-title">⋮⋮ Electrobet</h1>
//         </header>
//         <section>
//           <table className="info">
//             <tbody>
//               <tr>
//                 <td>Betting contract</td>
//                 <td>{this.state.betAddress}</td>
//               </tr>
//               <tr>
//                 <td>Account</td>
//                 <td>{this.state.account}</td>
//               </tr>
//               <tr>
//                 <td>Current ERC-20 token</td>
//                 <td>
//                   {/* ToDo: Check this '?'*/}
//                   <select
//                     value={selectedTokenAddress}
//                     onChange={this.handleSelectedTokenAddressChange}
//                   >
//                     {tokens.map(token => (
//                       <option key={token.address} value={token.address}>
//                         {token.name || token.address}
//                       </option>
//                     ))}
//                   </select>
//                 </td>
//               </tr>
//             </tbody>
//           </table>
//         </section>
//         <section>
//           <button onClick={this.testSignAndPut}>Sign &amp; PUT on server</button>
//         </section>

//         {/* {isChecked &&
//           bettingContract &&
//           selectedTokenAddress && (
//             <Token
//               web3={web3}
//               account={account}
//               tokenAddress={selectedToken.address}
//               electrobetAddress={bettingContract.address}
//               onDetailsUpdated={this.handleSelectedTokenDetailsUpdated}
//             />
//           )} */}

//         {/* <Bet token={this.state.selectedToken} values={bet} onValueChange={this.onBetValueChange} readOnly /> */}

//         {/* <Bet token={token} values={bet} onValueChange={this.onBetValueChange} /> */}

//         <section>
//           <h1>🍺🍺🍺 Free beer! 🍺🍺🍺</h1>
//           <button onClick={() => this.handleClaimFreeBeer(1)} title="You deserve it!">
//             Claim 1 free beer
//           </button>
//           <button onClick={() => this.handleClaimFreeBeer(5)} title="You deserve it!">
//             Claim 5 free beers
//           </button>
//           <button onClick={() => this.handleClaimFreeBeer(10)} title="You deserve it!">
//             Claim 10 free beers
//           </button>
//         </section>

//         {/* <section>
//           {bets.map(bet => (
//             <Bet key={bet.id} token={token} values={bet} readOnly onDelete={this.onBetDelete} />
//           ))}
//         </section> */}

//         <section>
//           <p className="App-intro">
//             Dummy value read from deployed contract:{' '}
//             <strong className={this.state.isDummyValueLoading ? 'loading' : ''}>
//               {this.state.dummyValue}
//             </strong>
//           </p>
//           <p>
//             <button onClick={this.handleClick}>Increment</button>
//           </p>
//         </section>
//       </div>
//     )
//   }
// }
