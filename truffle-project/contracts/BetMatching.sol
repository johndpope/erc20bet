pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/cryptography/MerkleTree.sol";

import "./lib/safemath/SafeMathUint32.sol";

import "./Bets.sol";
import "./GameAction.sol";
import "./UsesRNG.sol";


contract BetMatching is GameAction, UsesRNG {

    /// @dev Since for loops often run from i = 0 to n - 1, we create this constant
    /// so that when we start instead from i = ONE_INDEX, it is conspicuous.
    uint256 private constant ZERO_INDEX = 0;
    uint256 private constant ONE_INDEX = 1;

    using SafeMathUint32 for uint32;
    uint32 private constant MAX_UINT32 = 2 ** 32 - 1;

    string constant REASON_TOKEN_ZERO_ADDRESS = "REASON_TOKEN_ZERO_ADDRESS";
    string constant REASON_GAME_EXPIRY_NOT_IN_FUTURE = "REASON_GAME_EXPIRY_NOT_IN_FUTURE";
    string constant REASON_PLACED_BET_SHOULD_HAVE_NO_SIGNATURE = "REASON_PLACED_BET_SHOULD_HAVE_NO_SIGNATURE";
    string constant REASON_SIGNATURE_INVALID = "REASON_SIGNATURE_INVALID";
    string constant REASON_BET_IN_NON_MATCHABLE_STATE = "REASON_BET_IN_NON_MATCHABLE_STATE";
    string constant REASON_BET_EXPIRY_NOT_AFTER_GAME_EXPIRY = "REASON_BET_EXPIRY_NOT_AFTER_GAME_EXPIRY";

    string constant REASON_GAME_TOO_FEW_BETS = "REASON_GAME_TOO_FEW_BETS";
    string constant REASON_GAME_TOO_FEW_OUTCOMES = "REASON_GAME_TOO_FEW_OUTCOMES";
    string constant REASON_PLAYER_ZERO_OR_DUPLICATE = "REASON_PLAYER_ZERO_OR_DUPLICATE";
    string constant REASON_BET_IMPOSSIBLE = "REASON_BET_IMPOSSIBLE";
    string constant REASON_BET_PAYOUT_NOT_LARGER_THAN_STAKE = "REASON_BET_PAYOUT_NOT_LARGER_THAN_STAKE";
    string constant REASON_BET_OUTCOME_DUPLICATE_SUBSCRIPTS = "REASON_BET_OUTCOME_DUPLICATE_SUBSCRIPTS";
    string constant REASON_BET_TOT_OUTCOME_PROB_NOT_ENOUGH = "REASON_BET_TOT_OUTCOME_PROB_NOT_ENOUGH";

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
        /// ToDo: Use bytes instead
        uint8[] outcomeSubscripts
    );

    struct MatchedBet {
        Bets.Params params;
        address player;
        Signatures.Signature optionalSig;
        uint8[] outcomeSubscripts;
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

    /// @notice Ensures that all probabilities and token amounts add up.
    /// * Minimum of 2 bets
    /// * Minimum of 2 outcomes
    /// * For all bets:
    ///   - Pr(winning) must be > 0
    ///   - The sum of probabilities of all outcomes in which the bet is a winner
    ///     must equal or exceed the agreed Pr(winning) for that bet.
    ///   - There must not be another bet by the same player in the same match.
    ///   - Outcome subscripts must be sorted ascending (and hence unique)
    /// @param bets Must be passed from the outside pre-sorted ascending by bet owner.
    /// This makes it possible to check for no duplicate owners with a single pass.
    function validateMatch(
        MatchedBet[] bets,
        Outcome[] outcomes
    )
        internal
        pure
    {

        uint256 i;
        uint256 j;

        require(2 <= bets.length, REASON_GAME_TOO_FEW_BETS);
        require(2 <= outcomes.length, REASON_GAME_TOO_FEW_OUTCOMES);

        uint256 pot = 0;

        address precedingPlayer = address(0);
        for (i = 0; i < bets.length; i++) {
            MatchedBet memory bet = bets[i];
            require(precedingPlayer < bet.player, REASON_PLAYER_ZERO_OR_DUPLICATE);

            Bets.Params memory betParams = bet.params;

            require(0 < betParams.prob, REASON_BET_IMPOSSIBLE);
            require(betParams.stake < betParams.payout, REASON_BET_PAYOUT_NOT_LARGER_THAN_STAKE);

            pot = pot.safeAdd(betParams.stake);

            uint8[] memory outcomeSubscripts = bet.outcomeSubscripts;

            uint32 sumOfOutcomeProbs = 0;

            // Run first iteration outside the for-loop, so that
            // we can initialize precedingOutcomeSubscript
            uint256 outcomeSubscript = outcomeSubscripts[ZERO_INDEX];
            Outcome memory outcome = outcomes[outcomeSubscript];
            sumOfOutcomeProbs = sumOfOutcomeProbs.safeAdd(outcome.prob);
            outcome.sumOfBetPayouts = outcome.sumOfBetPayouts.safeAdd(betParams.payout);

            uint256 precedingOutcomeSubscript = outcomeSubscript;

            for (j = ONE_INDEX; j < outcomeSubscripts.length; j++) {
                outcomeSubscript = outcomeSubscripts[j];
                require(precedingOutcomeSubscript < outcomeSubscript, REASON_BET_OUTCOME_DUPLICATE_SUBSCRIPTS);

                outcome = outcomes[outcomeSubscript];
                sumOfOutcomeProbs = sumOfOutcomeProbs.safeAdd(outcome.prob);
                outcome.sumOfBetPayouts = outcome.sumOfBetPayouts.safeAdd(betParams.payout);
                
                precedingOutcomeSubscript = outcomeSubscript;
            }

            require(betParams.prob <= sumOfOutcomeProbs, REASON_BET_TOT_OUTCOME_PROB_NOT_ENOUGH);

            // prepare for next iteration
            precedingPlayer = bet.player;
        }

        // Accumulate outcome probabilties, and assert that they add up to 1.0
        // E.g. Suppose 4-bit and p = [8, 8], then [(min, max)] = [(0, 7), (8, 15)]
        require(0 < outcomes[0].prob, "An outcome must have positive probability of happening");
        outcomes[0].minResult = 0;
        outcomes[0].maxResult = outcomes[0].prob - 1;
        require(outcomes[0].sumOfBetPayouts == pot, "Total payout in this outcome not exactly equal to pot.");
        for (i = ONE_INDEX; i < outcomes.length; i++) {
            Outcome memory outcome = outcomes[i];
            require(0 < outcome.prob, "An outcome must have positive probability of happening");
            outcome.minResult = outcomes[i - 1].maxResult.safeAdd(1);
            outcome.maxResult = outcomes[i - 1].maxResult.safeAdd(outcome.prob);
            require(outcome.sumOfBetPayouts == pot, "Total payout in this outcome not exactly equal to pot.");
        }

        require(outcomes[outcomes.length - 1].maxResult == MAX_UINT32, "Total probability over outcomes must add up to exactly 1.0");

    }


    /// @dev Start counting from 1 so that game 0 never exists, and default gameId value
    /// in MatchedBet structure suddenly attains the meaning of `null`
    uint256 public storedNextGameId = 1;

    event GameStarted(
        /// @dev ToDo: Does this need to be indexed?
        uint256 gameId,

        /// @dev The outcome probabilties, from which we may assemble
        /// the [minResult, maxResult] ranges.
        uint32[] outcomeProbs
    );

    function bytes32ToUint8Array(bytes32 encoded) internal pure returns (uint8[] decoded) {
        return new uint8[](0);
    }

    function restructureMatchedBet(IERC20 token, uint256[10] betValues) internal pure returns (MatchedBet bet) {
        return MatchedBet({
            player: betValues[0].safeToUint160(),
            params: Bets.Params({
                token: token,
                stake: betValues[1],
                payout: betValues[2],
                prob: betValues[3].safeToUint32(),
                expiry: betValues[4],
                nonce: betValues[5]
            }),
            optionalSig: Signatures.Signature({
                v: betValues[6].safeToUint8(),
                r: bytes32(betValues[7]),
                s: bytes32(betValues[8])
            }),
            outcomeSubscripts: bytes32ToUint8Array(bytes32(betValues[9]))
        });
    }

    function startGame(
        IERC20 token,
        uint256 maxEndTimestamp,
        uint256[10][] destructuredMatchedBets,
        uint32[] outcomeProbs
    )
        external
    {
        MatchedBet[] memory matchedBets = new MatchedBet[](destructuredMatchedBets.length);
        for (uint256 i = 0; i < matchedBets.length; i++) {
            matchedBets[i] = restructureMatchedBet(token, destructuredMatchedBets[i]);
        }
        startGame(token, maxEndTimestamp, matchedBets, outcomeProbs);
    }

    function startGame(
        IERC20 token,
        uint256 maxEndTimestamp,
        MatchedBet[] bets,
        uint32[] outcomeProbs
    )
        internal
    {
        // solium-disable-next-line security/no-block-members
        require(block.timestamp < maxEndTimestamp, REASON_GAME_EXPIRY_NOT_IN_FUTURE);

        require(address(token) != address(0), REASON_TOKEN_ZERO_ADDRESS);

        uint256 ticketCount = 0;

        // In this first loop, for each bet we check conditions that might suddenly fail
        // depending on how the state of the blockchain might have changed between
        // this transaction being sent, and it being mined. We perform this first
        // so that if it is to fail, it fails quickly before wasting more gas.
        // In particular we pay attention to not write to the blockchain in any way
        // in this loop, as that is what wastes most gas.
        for (uint256 i = 0; i < bets.length; i++) {
            MatchedBet memory bet = bets[i];

            address player = bet.player;
            Bets.Params memory betParams = bet.params;

            require(maxEndTimestamp < betParams.expiry, REASON_BET_EXPIRY_NOT_AFTER_GAME_EXPIRY);

            bytes32 betId = bet.params.getIdForPlayer(player);
            
            StoredBetInfo storage storedBetInfo = getPlayerBetStorage(player, betId);

            BetState state = storedBetInfo.state;

            if (state == BetState.Placed) {
                // A signature _might_ have been passed for this bet if
                // just before startGame() the player decided to place
                // the bet on-chain via placeBet()
                // In that case, we do not waste gas checking the signature,
                // as the fact that it is in the `Placed` state means
                // that the bet is placed and paid.
            } else if (state == BetState.Unknown) {
                // If the bet is Unknown, there must be a corresponding
                // valid signature.
                require(
                    // ToDo: We are re-calculating hash (already calculated it during getIdForPlayer)
                    bet.optionalSig.recoverSignerForHash(betParams.getHashForSigning()) == player,
                    REASON_SIGNATURE_INVALID
                );
                // Note: If this transaction reverts, it may or may not contain a reason
                // string (and most probably not)
                bet.params.untrustedSafeTransferStakeFromPlayer(player);
            } else {
                revert(REASON_BET_IN_NON_MATCHABLE_STATE);
            }

            // Once we are going through all bets, take advantage to count the
            // total number of tickets, which we will use later to
            // pre-allocate the ticket-hashes array.
            ticketCount += bet.outcomeSubscripts.length;
        }

        Outcome[] memory outcomes = new Outcome[](outcomeProbs.length);
        for (uint256 i = 0; i < outcomeProbs.length; i++) {
            outcomes[i].prob = outcomeProbs[i];
        }

        // On the other hand, in this second loop, we check conditions that are not dependent
        // on the state of the blockchain, but just on the inputs, so in theory if we pass
        // correct values, this stage should never fail.
        // Even though it will not fail, of course we must perform these checks in the contract
        // as here lies the proof that this game is being played by the rules.
        validateMatch(bets, outcomes);

        playGame(
            token,
            maxEndTimestamp,
            bets,
            outcomes,
            outcomeProbs,
            ticketCount
        );
    }

    function playGame(
        IERC20 token,
        uint256 maxEndTimestamp,
        MatchedBet[] bets,
        Outcome[] outcomes,
        uint32[] outcomeProbs,
        uint256 ticketCount
    )
        internal
    {
        uint256 gameId = storedNextGameId++;

        Game storage storedGame = storedGames[gameId];

        // Sanity check
        assert(storedGame.state == GameState.Unknown);

        storedGame.token = token;
        storedGame.maxEndTimestamp = maxEndTimestamp;

        storedGame.ticketsMerkleRoot = goThroughBets(gameId, bets, outcomes, ticketCount);

        // ToDo: Investigate what would happen if the function requestRandomNumber, while being evaluated,
        // called back into some other function in this contract.
        storedRNG.sendRNGRequest({ requestId: gameId });

        // Note: We set this after calling requestRandomNumber, so if it accidentally called back into the
        // IRNGClient methods, it would be blocked because the game state would still be `Unknown`.
        storedGame.state = GameState.RNGRequestSent;

        emit GameStarted({
            gameId: gameId,
            outcomeProbs: outcomeProbs
        });
    }

    function goThroughBets(
        uint256 gameId,
        MatchedBet[] bets,
        Outcome[] outcomes,
        uint256 ticketCount
    )
        internal
        returns (
            bytes32 ticketsMerkleRoot
        )
    {
        bytes32[] memory ticketHashes = new bytes32[](ticketCount);
        uint256 k = 0;

        // This is a bit of a hack - we chop the first 8 bits off the gameId
        // so that we can pack the 8-bit state and 248-bit gameId into a single
        // 256-bit storage slot.
        uint248 gameId248 = gameId.safeToUint248();

        // At this point, we know that all inputs are valid and the game may be played.
        // First we emit BetMatched events.
        for (uint256 i = 0; i < bets.length; i++) {

            MatchedBet memory bet = bets[i];

            // ToDo: Cache these
            bytes32 betId = bet.params.getIdForPlayer(bet.player);

            uint8[] memory outcomeSubscripts = bet.outcomeSubscripts;

            for (uint256 j = 0; j < outcomeSubscripts.length; j++) {
                Outcome memory outcome = outcomes[outcomeSubscripts[j]];
                ticketHashes[k++] = computeTicketHash({
                    player: bet.player,
                    minResult: outcome.minResult,
                    maxResult: outcome.maxResult,
                    payout: bet.params.payout
                });
            }

            // ToDo: Ensure that this is compiled to a single SSTORE
            StoredBetInfo storage playerBetStorage = getPlayerBetStorage(bet.player, betId);
            playerBetStorage.state = BetState.Matched;
            playerBetStorage.matchedGameId = gameId248;

            emit BetMatched({
                betId: betId,
                betOwner: bet.player,
                payout: bet.params.payout,
                outcomeSubscripts: outcomeSubscripts
            });
        }

        return MerkleTree.computeRoot(ticketHashes);
    }

    string constant REASON_ONLY_PREDETERMINED_RNG_MAY_CALL_BACK = "REASON_ONLY_PREDETERMINED_RNG_MAY_CALL_BACK";
    string constant REASON_GAME_NOT_WAITING_FOR_RESPONSE = "REASON_GAME_NOT_WAITING_FOR_RESPONSE";
    string constant REASON_GAME_NOT_YET_EXPIRED = "REASON_GAME_NOT_YET_EXPIRED";

    event GameEndedOk(uint256 indexed gameId);

    function handleRNGResponse(uint256 gameId, uint32 generatedRandomNumber) public {
        require(msg.sender == address(storedRNG), REASON_ONLY_PREDETERMINED_RNG_MAY_CALL_BACK);
        Game storage storedGame = storedGames[gameId];
        require(storedGame.state == GameState.RNGRequestSent, REASON_GAME_NOT_WAITING_FOR_RESPONSE);
        // An RNG respecting the interface should never respond after maxEndTimestamp
        assert(block.timestamp <= storedGame.maxEndTimestamp);
        storedGame.state == GameState.RNGResponseReceived;
        storedGame.generatedRandomNumber = generatedRandomNumber;
        emit GameEndedOk(gameId);
    }

    event GameEndedError(uint256 indexed gameId);

    /// @dev May be called by anyone
    function alertRNGTimeout(uint256 gameId) public {
        Game storage storedGame = storedGames[gameId];
        require(storedGame.state == GameState.RNGRequestSent, REASON_GAME_NOT_WAITING_FOR_RESPONSE);
        require(storedGame.maxEndTimestamp < block.timestamp, REASON_GAME_NOT_YET_EXPIRED);
        storedGame.state == GameState.RNGResponseTimedOut;
        emit GameEndedError(gameId);
    }

}
