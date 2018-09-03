/*
  Copyright 2018 Edward Grech <dwardu@gmail.com>
*/
pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/ownership/HasNoEther.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/MerkleProof.sol";

import "./lib/safemath/SafeMathUint256.sol";
import "./lib/safemath/SafeMathUint32.sol";
// import "./helpers/Signatures.sol";
import "./lib/merkle/MerkleTree.sol";
import "./Temporary.sol";

import  "./rng/Rng.sol";


contract Erc20BetExchange is Temporary, Ownable, HasNoEther  {

    using SafeMathUint256 for uint256;
    using SafeMathUint32 for uint32;
    using Signatures for Signatures.Signature;

    uint32 constant MAX_UINT32 = 2 ** 32 - 1;

    uint32 constant TEMP = 1;
    
    Rng public storedRng;

    Rng public $rng;

    string constant REASON_BET_PREVIOUSLY_PLACED = "BET_PREVIOUSLY_PLACED";

    constructor(Rng rng) public {
        storedRng = rng;
        $rng = rng;
    }

    struct Outcome {
        /// @notice The probability of this outcome being the winning one, times 2 ** 32
        uint32 prob;

        uint32 minResult;
        uint32 maxResult;

        /// @dev Temporary field, used for accumulating bet probs
        /// to ensure the add up to the pot.
        uint256 sumOfBetPayouts;
    }

    struct Bet {
        // ----- Only these are signed -----    
        // address bettingContract;
        // address token;
        uint256 stake;
        uint256 payout;
        uint32 prob;
        uint256 expiry;
        uint256 nonce;

        // This is not part of signed payload, it is recovered from signature
        address owner;  

        /// @dev ECDSA signature by the bet owner of the hash
        /// keccak256(abi.encodePacked(token, stake, payout, prob, expiry, nonce, address(this)))
        /// Note that it does not contain the owner itself, as we want to minimize the number
        /// of fields presented to the user to sign.
        Signatures.Signature signature;

        /// @dev The number of tickets this player has, or else,
        /// the number of outcomes that this bet is a member of.
        uint256 numTickets;

        // We cache this here to calculate it only once.
        bytes32 betId;

        /// @dev Temporary field, used for accumulating outcome probs
        /// to ensure they add up to 1.0
        uint32 sumOfOutcomeProbs;
    }

    struct TicketSubscriptPair {
        uint256 betSubscript;
        uint256 outcomeSubscript;
    }

    enum BetState {
        Unknown,
        PlacedNotMatched,
        Matched,
        Closed
    }

    mapping (bytes32 => BetState) public storedBetStates;


    event BetPlaced(
        /// @dev Indexed so that a player can search for
        /// bets he might have placed.
        address indexed owner,

        /// @dev It can be useful to be able to search
        /// for bets by their unique id.
        bytes32 indexed betId,

        /// @dev Indexed so that someone can watch the
        /// blockchain for bets in a particular ERC-20 token.
        address indexed token,

        /// The remaining fields constitute the
        /// terms of the bet, and are not indexed.
        uint256 stake,
        uint256 payout,
        uint32 prob,
        uint256 expiry,
        uint256 nonce
    );

    /// @notice Place a bet on the blockchain.
    /// @dev This will attribute the bet to `msg.sender`. Later, when it is matched,
    /// there will be no need for it to be signed with a further ECDSA signature.
    function placeBet(
        address token,
        uint256 stake,
        uint256 payout,
        uint32 prob,
        uint256 expiry,
        uint256 nonce
    )
        public
    {
        bytes32 betHash = keccak256(abi.encodePacked(token, stake, payout, prob, expiry, nonce, address(this)));
        bytes32 betId = keccak256(abi.encodePacked(msg.sender, betHash));
        bytes32 betKey = keccak256(abi.encodePacked(msg.sender, betId));

        require(storedBetStates[betKey] == BetState.Unknown, REASON_BET_PREVIOUSLY_PLACED);
        storedBetStates[betKey] = BetState.PlacedNotMatched;

        emit BetPlaced({
            owner: msg.sender,
            betId: betId,
            token: token,
            stake: stake,
            payout: payout,
            prob: prob,
            expiry: expiry,
            nonce: nonce
        });
    }

    event BetCancelled(address indexed player, bytes32 indexed betId);

    /// @notice Cancel a bet.
    /// If a bet has been placed on-chain via `placeBet()`, calling this function will nullify it.
    /// For bets that have been signed off-chain but not yet placed, calling this function will prevent it from being placed.
    function cancelUnmatchedBet(bytes32 betId) public {
        bytes32 betKey = keccak256(abi.encodePacked(msg.sender, betId));
        require(storedBetStates[betKey] == BetState.PlacedNotMatched, "Only placed and unmatched bets can be cancelled");
        storedBetStates[betKey] = BetState.Closed;
        emit BetCancelled(msg.sender, betId);
    }

    /// @dev Since for loops often run from i = 0 to n - 1, we create this constant
    /// so that when we start instead from i = ONE, it is conspicuous.
    uint256 constant private ONE = 1;

    /// @notice Validates game parameters.
    /// @param bets The bets.
    /// The bets must be passed from the outside pre-sorted ascending by bet owner.
    /// This makes it possible to check for no duplicate owners with a single pass.
    /// Note: This can be a problem if calling from a contract! But could be solved if some owner-id
    /// is passed instead of an actual address.
    /// In addition the bet owner should never be the zero-address.
    function performChecks(Bet[] bets, Outcome[] outcomes, TicketSubscriptPair[] ticketSubscriptPairs) internal pure {
        uint256 i;
        Bet memory bet;
        Outcome memory outcome;
        TicketSubscriptPair memory pairPrev;
        TicketSubscriptPair memory pairCurr;

        // Bet-outcome subscript pairs
        require(ticketSubscriptPairs[0].betSubscript == 0, "Must start from bet 0");
        for (i = ONE; i < ticketSubscriptPairs.length; i++) {
            pairPrev = ticketSubscriptPairs[i - 1];
            pairCurr = ticketSubscriptPairs[i];
            // solium-disable-next-line max-len
            require(
                pairPrev.betSubscript + 1 == pairCurr.betSubscript || pairPrev.betSubscript == pairCurr.betSubscript && pairPrev.outcomeSubscript < pairCurr.outcomeSubscript,
                "Outcome-bet subscript pairs should be sorted by outcome ascending, then by bet ascending"
            );
        }

        for (i = 0; i < ticketSubscriptPairs.length; i++) {
            pairCurr = ticketSubscriptPairs[i];
            bet = bets[pairCurr.betSubscript];
            outcome = outcomes[pairCurr.outcomeSubscript];
            bet.sumOfOutcomeProbs = bet.sumOfOutcomeProbs.safeAdd(outcome.prob);  // row sum
            outcome.sumOfBetPayouts = outcome.sumOfBetPayouts.safeAdd(bet.payout); // column sum

            // Once we're going through all the tickets, take the opportunity
            // to count the tickets for each bet.
            bet.numTickets++;
        }

        uint256 pot = 0;

        require(2 <= bets.length, "There must be at least 2 bets to match");
        address precedingBetOwner = address(0);
        for (i = 0; i < bets.length; i++) {
            bet = bets[i];

            // ToDo: Get this back!
            // solium-disable-next-line max-len
            require(precedingBetOwner < bet.owner, "Bet owner must not be 0-address, there cannot be more than 1 bet per owner in a game, and bets must be sorted by owner address ascending.");

            precedingBetOwner = bet.owner;
            require(bet.stake < bet.payout, "Payout must be greater than stake");
            require(0 < bet.prob, "Must have 0 < Pr(winning)");
            // Note: As all uint32 < 0x100000000, no need to enforce "Pr(winning) < 1"

            require(bet.prob <= bet.sumOfOutcomeProbs, "One of the bet's sum of its outcome probs < bet.prob");
            pot = pot.safeAdd(bet.stake);
        }

        require(2 <= outcomes.length, "There must be at least 2 outcomes");

        // Accumulate outcome probabilties, and assert that they add up to 1.0
        // E.g. Suppose 4-bit and p = [8, 8], then [(min, max)] = [(0, 7), (8, 15)]
        require(0 < outcomes[0].prob, "An outcome must have positive probability of happening");
        outcomes[0].minResult = 0;
        outcomes[0].maxResult = outcomes[0].prob - 1;
        require(outcomes[0].sumOfBetPayouts == pot, "Total payout in this outcome not exactly equal to pot.");
        for (i = ONE; i < outcomes.length; i++) {
            outcome = outcomes[i];
            require(0 < outcome.prob, "An outcome must have positive probability of happening");
            outcome.minResult = outcomes[i - 1].maxResult.safeAdd(1);
            outcome.maxResult = outcomes[i - 1].maxResult.safeAdd(outcome.prob);
            require(outcome.sumOfBetPayouts == pot, "Total payout in this outcome not exactly equal to pot.");
        }

        require(outcomes[outcomes.length - 1].maxResult == MAX_UINT32, "Total probability over outcomes must add up to exactly 1.0");
    }

    enum GameState {
        None,
        RngRequestSent,
        RngResponseReceivedOk,
        RngResponseReceivedError
    }

    struct Game {
        GameState state;
        uint32 generatedRandomNumber;
        address token;
        bytes32 ticketsMerkleRoot;
    }

    mapping(bytes32 => Game) public storedGames;


    /// @dev This event will allow a player to retrieve this
    /// transaction by betOwner or betId
    event BetMatched(
        bytes32 indexed betId,

        /// @dev Only necessary if a player misplaces his bet data.
        /// In addition, it is indexed to enable an owner to search for
        /// his this transaction if the only thing he remembers is his address.
        address indexed betOwner,

        /// @dev Only necessary for when a user misplaces his bet data, he will
        /// need it to withdraw winnings.
        uint256 payout,

        /// @dev What we really need is an array with the subscripts of outcomes
        /// so that we can look into GameOpened.outcomeProbs and construct the ranges.
        /// But this will suffice.
        uint256 numTickets
    );

    event GameOpened(
        bytes32 gameId,

        /// @dev The outcome probabilties, from which we may assemble
        /// the [minResult, maxResult] ranges.
        uint32[] outcomeProbs,

        /// @dev The root of the ticket hash Merkle tree we persist to contract storage,
        /// the leaves instead we "broadcast" here. A winner will be able to use this
        /// information to provide proof to substantiate his claim to the winnings.
        bytes32[] ticketHashes,


        /// @dev Subscripts into outcomes corresponding to `outcomeProbs` array,
        /// of one bet after the other, flattened into a flat array.
        /// [ ...outcomes(bet0), ...outcomes(bet1), ...outcomes(bet3) ]
        uint256[] ticketOutcomeSubscripts
    );


    /**
     * @dev Executes a game.
     *
     * Example 1
     * ---------
     *
     * Consider the following 2 bets:
     *
     *     bet  stake payout prob
     *     ---- ----- ------ ----
     *      b0     10     40    ¼
     *      b1     10     40    ¼
     *      b2     20     40    ½
     *
     * All the numbers add up, so as long as each player’s allowance covers
     * his stake, the bets are signed by their owners, and they are not expired,
     * we’re good to go.
     *
     * This bet could be matched as follows in a game with two
     * outcomes, o0 and 01:
     *
     *     bet  o0  outcomeSubscriptPrev
     *     --- --- --- 
     *      b0   T   ·   ∑=¼ ✓
     *      b1   T   ·   ∑=¼ ✓
     *      b2   ·   T   ∑=½ ✓
     *         p=½ p=½
     *           ½ + ½ = 1
     *
     * T means Ticket.
     *
     * outcomeProbs = [0x80000000, 0x80000000]
     *                 P(o0)=½     P(outcomeSubscriptPrev)=½
     *
     *                               b  o
     * ticketBetOutcomeSubscriptPairArrays = [[0, 0],
     *                                        [1, 0],
     *                                        [2, 1]]
     *
     * Example 2
     * ---------
     *
     * Consider the following 3 bets:
     *
     *     bet  stake payout prob
     *     ---- ----- ------ ----
     *      b0     20     30    ⅔
     *      b1     20     30    ⅔
     *      b2     20     30    ⅔
     *
     * It might seem unlikely, but these 3 bets could be matched to each other
     * in a game of 3 outcomes, as follows:
     *
     *     bet  o0  outcomeSubscriptPrev  outcomeSubscriptCurr
     *     --- --- --- ---
     *      b0   T   T   ·  ∑=⅔ ✓
     *      b1   T   ·   T  ∑=⅔ ✓
     *      b2   ·   T   T  ∑=⅔ ✓
     *         p=⅓ p=⅓ p=⅓
     *           ⅓ + ⅓ + ⅓ = 1
     *
     * These values would be serialized as follows:
     *
     *     outcomeProbs = [0x55555555, 0x55555555, 0x55555556]
     *                     P(o0)≈⅓     P(outcomeSubscriptPrev)≈⅓     P(outcomeSubscriptCurr)≈⅓
     *
     *     ticketOutcomeSubscripts = [0, 1,  0, 2,  1, 2]
     *                                ----   ----   ----
     *                                b0     b1     b2
     *
     * In case you were wondering about what the bet probabilities would be,
     * because of the slight inaccuracy because of the ⅓,
     * they would be passed as:
     *
     *         desired p   actual p     
     *    ---  ----------  -------------------------------------------------
     *     b0  0xaaaaaaaa  0x55555555 + 0x55555555              = 0xaaaaaaaa
     *     b1  0xaaaaaaaa               0x55555555 + 0x55555556 = 0xaaaaaaab
     *     b2  0xaaaaaaaa               0x55555555 + 0x55555556 = 0xaaaaaaab
     *
     * So b1 and b2 have a slight advantage, to the detriment of b0. Such inaccuracies aren't going to
     * have a significant impact on the fairness of the game, but it is important to analyse such edge cases
     * to ensure that the numbers will add up and all constraints imposed by the smart contract
     * are satisfied.
     * 
     */
    function openGame(
        address token,
        uint256[9][] betValuesArray,
        uint32[] outcomeProbs,
        uint256[2][] ticketBetOutcomeSubscriptPairArray
    )
        external
        returns (bytes32 gameId)
    {
        uint256 i;
        Bet memory bet;

        Bet[] memory bets = new Bet[](betValuesArray.length);
        for (i = 0; i < betValuesArray.length; i++) {
            bet = bets[i];
            uint256[9] memory betValues = betValuesArray[i];
            bet.owner  = betValues[0].safeToUint160();
            bet.stake  = betValues[1];
            bet.payout = betValues[2];
            bet.prob   = betValues[3].safeToUint32();
            bet.expiry = betValues[4];
            bet.nonce  = betValues[5];
            bet.signature.v = betValues[6].safeToUint8();
            bet.signature.r = bytes32(betValues[7]);
            bet.signature.s = bytes32(betValues[8]);
        }

        Outcome[] memory outcomes = new Outcome[](outcomeProbs.length);
        for (i = 0; i < outcomeProbs.length; i++) {
            outcomes[i].prob = outcomeProbs[i];
        }

        TicketSubscriptPair[] memory ticketSubscriptPairs = new TicketSubscriptPair[](ticketBetOutcomeSubscriptPairArray.length);
        for (i = 0; i < ticketBetOutcomeSubscriptPairArray.length; i++) {
            ticketSubscriptPairs[i].betSubscript = ticketBetOutcomeSubscriptPairArray[i][0];
            ticketSubscriptPairs[i].outcomeSubscript = ticketBetOutcomeSubscriptPairArray[i][1];
        }

        return openGameInternal(token, bets, outcomes, ticketSubscriptPairs, outcomeProbs);
    }

    function openGameInternal(
        address token,
        Bet[] bets,
        Outcome[] outcomes,
        TicketSubscriptPair[] ticketSubscriptPairs,
        // This is redundant... but handy to have an as array
        uint32[] outcomeProbs
    )
        internal
        returns (bytes32 gameId)
    {
        uint256 i;
        Bet memory bet;
        Outcome memory outcome;

        for (i = 0; i < bets.length; i++) {
            bet = bets[i];
            bytes32 betHash = keccak256(abi.encodePacked(token, bet.stake, bet.payout, bet.prob, bet.expiry, bet.nonce, address(this)));
            bet.betId = keccak256(abi.encodePacked(bet.owner, betHash));
            bytes32 betKey = keccak256(abi.encodePacked(bet.owner, bet.betId));

            if (bet.signature.isEmpty()) {
                require(storedBetStates[betKey] == BetState.PlacedNotMatched, "Bet with empty-signature sould be in Placed state");
            } else {
                require(storedBetStates[betKey] == BetState.Unknown,"Bet with signature sould be in Unknown state");

                // ToDo: Bring this up to date with EIP-712
                require(
                    bet.signature.isValid(
                        keccak256(abi.encodePacked(TYPES_HASH, betHash)),
                        bet.owner
                    ),
                    "Bet signature is invalid"
                );
            }
            // ToDo: Decide which order of the following results in best safety.
            require(block.timestamp < bet.expiry, "Bet must expire in the future");  // solium-disable-line security/no-block-members
            storedBetStates[betKey] = BetState.Matched;
            // Note: The problem with this require() is that the transferFrom will fail internally *without* a reason
            require(
                ERC20(token).transferFrom({
                    _from: bet.owner,
                    _to: address(this),
                    _value: bet.stake
                }),
                "Could not transferFrom tokens from player to betting contract"
            );
        }

        // Before we even called the contract, we called these functions on our local node
        // (for free) and ensured they do not fail.
        // Because they are pure, we know they will never fail.
        // Even though we would not have called this if we knew it was going to fail,
        // we must call it anyway as the purpose of this call is as a
        // ticketMerkleProof of correctness and fairness.
        performChecks({
            bets: bets,
            outcomes: outcomes,
            ticketSubscriptPairs: ticketSubscriptPairs
        });

        // --- At this point, we know that all inputs are valid and the storedGame is fair. ---

        for (i = 0; i < bets.length; i++) {
            bet = bets[i];
            emit BetMatched({
                betId: bet.betId,
                betOwner: bet.owner,
                payout: bet.payout,
                numTickets: bet.numTickets
            });
        }

        // ToDo: What if Rng contract calls back into this contract? Any re-entrancy issues?
        // ToDo: Should we check bet timestamps here?
        // solium-disable-next-line security/no-block-members
        gameId = storedRng.sendRequest({ maxResponseTimestamp: block.timestamp + 1 hours });

        Game storage storedGame = storedGames[gameId];
        // Since RNG request ID is guaranteed to be unique, a Game should always initially be in state None
        assert(storedGame.state == GameState.None);
        storedGame.state = GameState.RngRequestSent;
        storedGame.token = token;

        uint256 betSubscript;
        uint256 outcomeSubscriptcome;
        uint256[] memory ticketOutcomeSubscripts = new uint256[](ticketSubscriptPairs.length);
        bytes32[] memory ticketHashes = new bytes32[](ticketSubscriptPairs.length);
        for (i = 0; i < ticketSubscriptPairs.length; i++) {
            (betSubscript, outcomeSubscriptcome) = (ticketSubscriptPairs[i].betSubscript, ticketSubscriptPairs[i].outcomeSubscript);
            bet = bets[betSubscript];
            outcome = outcomes[outcomeSubscriptcome];
            ticketHashes[i] = keccak256(abi.encodePacked(bet.owner, bet.betId, bet.payout, outcome.minResult, outcome.maxResult));
            ticketOutcomeSubscripts[i] = outcomeSubscriptcome;
        }

        // Emit event *before* calling computeMerkleRoot, because it will overwrite the leaves!
        emit GameOpened({
            gameId: gameId,
            outcomeProbs: outcomeProbs,
            ticketHashes: ticketHashes,
            ticketOutcomeSubscripts: ticketOutcomeSubscripts
        });

        storedGame.ticketsMerkleRoot = MerkleTree.computeMerkleRoot(ticketHashes);

        return gameId;
    }
    


    event GameResultReceived(bytes32 gameId, uint32 number);

    function onRngResponseResult(bytes32 rngRequestId, uint256 result) public {
        require(msg.sender == address(storedRng), "Only agreed RNG may call back into betting contract with result");
        assert(storedGames[rngRequestId].state == GameState.RngRequestSent);
        emit GameResultReceived({ gameId: rngRequestId, number: uint32(result) });
        storedGames[rngRequestId].state = GameState.RngResponseReceivedOk;
        storedGames[rngRequestId].generatedRandomNumber = uint32(result);
    }

    function onRngResponseError(bytes32 rngRequestId) public {
        require(msg.sender == address(storedRng), "Only agreed RNG may call back into betting contract with error");
        assert(storedGames[rngRequestId].state == GameState.RngRequestSent);
        storedGames[rngRequestId].state = GameState.RngResponseReceivedError;
    }

    // ToDo: We could pass the betOwner explicitly, instead of using msg.sender.
    // The function doesn't need any permissions from msg.sender.
    function claimWonBet(
        bytes32 gameId,
        bytes32 betId,
        uint256 betPayout,
        uint32 ticketMinResult,
        uint32 ticketMaxResult,
        bytes32[] ticketMerkleProof
    )
        public
    {
        Game storage storedGame = storedGames[gameId];
        require(storedGame.state == GameState.RngResponseReceivedOk, "Game must be in Ok state to claim a ticket");
        require(
            ticketMinResult <= storedGame.generatedRandomNumber && storedGame.generatedRandomNumber <= ticketMaxResult,
            "Ticket [minResult, maxResult] range does not contain generated random number"
        );        
        bytes32 betKey = keccak256(abi.encodePacked(msg.sender, betId));
        require(storedBetStates[betKey] == BetState.Matched, "Ticket's parent bet is not in the Matched state");
        bytes32 ticketHash = keccak256(abi.encodePacked(msg.sender, betId, betPayout, ticketMinResult, ticketMaxResult));
        require(
            MerkleProof.verifyProof(ticketMerkleProof, storedGame.ticketsMerkleRoot, ticketHash),
            "Merkle-proof for ticket hash is not valid"
        );


        // First we mark the bet as Closed, and we transfer the tokens later.
        // Since the token contract .transfer() method could be mailicious,
        // we guard against it.
        storedBetStates[betKey] = BetState.Closed;

        // ToDo: .transfer() could be malicious! Limit damage.
        // Maybe by restricting gas?
        require(ERC20(storedGame.token).transfer(msg.sender, betPayout), "Token transfer failed");
    }

}
