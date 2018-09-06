pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./GameAction.sol";


contract BetClaiming is GameAction {

    string constant REASON_BET_NOT_IN_MATCHED_STATE = "REASON_BET_NOT_IN_MATCHED_STATE";
    string constant REASON_GAME_DID_NOT_RECEIVE_RANDOM_NUMBER = "REASON_GAME_DID_NOT_RECEIVE_RANDOM_NUMBER";
    string constant REASON_TICKET_NOT_WINNING = "REASON_TICKET_NOT_WINNING";
    string constant REASON_TICKET_MERKLE_PROOF_INVALID = "REASON_TICKET_MERKLE_PROOF_INVALID";

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
        uint32 result = storedGame.generatedRandomNumber;
        require(minResult <= result && result <= maxResult, REASON_TICKET_NOT_WINNING);
        storedBetInfo.state = BetState.Claimed;
        // Last on purpose
        storedGame.token.safeTransfer({
            _to: player,
            _value: payout
        });
    }


    
    // // ToDo: We could pass the betOwner explicitly, instead of using msg.sender.
    // // The function doesn't need any permissions from msg.sender.
    // function claimWonBet(
    //     bytes32 gameId,
    //     bytes32 betId,
    //     uint256 betPayout,
    //     uint32 ticketMinResult,
    //     uint32 ticketMaxResult,
    //     bytes32[] ticketMerkleProof
    // )
    //     public
    // {
    //     Game storage storedGame = storedGames[gameId];
    //     require(storedGame.state == GameState.RngResponseReceivedOk, "Game must be in Ok state to claim a ticket");
    //     require(
    //         ticketMinResult <= storedGame.generatedRandomNumber && storedGame.generatedRandomNumber <= ticketMaxResult,
    //         "Ticket [minResult, maxResult] range does not contain generated random number"
    //     );        
    //     bytes32 betId = keccak256(abi.encodePacked(msg.sender, betId));
    //     require(storedBetInfos[betId].state == BetState.Matched, "Ticket's parent bet is not in the Matched state");
    //     bytes32 ticketHash = keccak256(abi.encodePacked(msg.sender, betId, betPayout, ticketMinResult, ticketMaxResult));
    //     require(
    //         MerkleProof.verifyProof(ticketMerkleProof, storedGame.ticketsMerkleRoot, ticketHash),
    //         "Merkle-proof for ticket hash is not valid"
    //     );


    //     // First we mark the bet as Claimed, and we transfer the tokens later.
    //     // Since the token contract .transfer() method could be mailicious,
    //     // we guard against reentrancy.
    //     storedBetInfos[betId].state = BetState.Claimed;

    //     // ToDo: .transfer() could be malicious! Limit damage.
    //     // Maybe by restricting gas?
    //     require(ERC20(storedGame.token).transfer(msg.sender, betPayout), "Token transfer failed");
    // }

}
