pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./UsingBetStorage.sol";
import "./UsingGameStorage.sol";


contract SupportingClaim is UsingBetStorage, UsingGameStorage {

    string constant REASON_BET_NOT_IN_MATCHED_STATE = "REASON_BET_NOT_IN_MATCHED_STATE";
    string constant REASON_GAME_DID_NOT_RECEIVE_RANDOM_NUMBER = "REASON_GAME_DID_NOT_RECEIVE_RANDOM_NUMBER";
    string constant REASON_TICKET_NOT_WINNING = "REASON_TICKET_NOT_WINNING";
    string constant REASON_TICKET_MERKLE_PROOF_INVALID = "REASON_TICKET_MERKLE_PROOF_INVALID";

    event ClaimedWonBet(

        // @dev Lets a player subscribe to his own claims
        address indexed player,

        // @dev Redundant, but lets a player subscribe to all events
        // pertaining to a bet in a straightforward way.
        bytes32 indexed betId,
        
        // @dev Lets the game-maker track all events related
        // to a particular game.
        uint256 indexed gameId
    );

    /// @notice Claim a winning bet.
    /// Must present associated information and a proof that this particular ticket
    /// is in the bet with `betId`
    /// The bet is required to be in the `Matched` state.
    /// If the ticket is not a winning ticket, the transaction fails.
    /// If it is a winning ticket, the bet state changes to `Claimed`.
    /// Note that the claim may be presented by anyone - the won tokens will
    /// go to the bet owner. A casino might take advantage of this to offer
    /// a service to its customers, so that the customers do not need ETH to
    /// pay for gas. But if casino fails its responsibilities, the transaction
    /// can always be initiated by the player.
    /// Note that all information necessary to claim the winning tokens may be assembled
    /// from the game logs.
    /// @dev ToDo: Make this method also detect RNG timeout, or leave that to its
    /// own function?
    function claimBet(
        address player,
        bytes32 betId,
        uint32 minResult,
        uint32 maxResult,
        uint256 payout,
        bytes32[] ticketMerkleProof
    )
        external
    {
        StoredBetInfo storage storedBetInfo = getPlayerBetStorage(player, betId);
        require(storedBetInfo.state == BetState.Matched, REASON_BET_NOT_IN_MATCHED_STATE);
        Game storage storedGame = storedGames[storedBetInfo.matchedGameId];
        require(storedGame.state == GameState.RNGResponseReceived, REASON_GAME_DID_NOT_RECEIVE_RANDOM_NUMBER);

        // First test the easy bit
        uint32 result = storedGame.generatedRandomNumber;
        require(minResult <= result && result <= maxResult, REASON_TICKET_NOT_WINNING);

        // If that passes, do the more gas-intensive part
        bytes32 ticketHash = computeTicketHash({
            player: player,
            minResult: minResult,
            maxResult: maxResult,
            payout: payout
        });
        require(
            MerkleTree.verifyProof({
                _proof: ticketMerkleProof,
                _root: storedGame.ticketsMerkleRoot,
                _leaf: ticketHash
            }),
            REASON_TICKET_MERKLE_PROOF_INVALID
        );

        storedBetInfo.state = BetState.Claimed;
        // Last on purpose, to guard against reentrancy
        storedGame.token.safeTransfer({
            _to: player,
            _value: payout
        });

        emit ClaimedWonBet({
            player: player,
            betId: betId,
            gameId: storedBetInfo.matchedGameId
        });

    }

}
