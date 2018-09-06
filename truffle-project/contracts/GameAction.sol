pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./Base.sol";


contract GameAction is Base {

    enum GameState {
        Unknown,
        RNGRequestSent,
        RNGResponseReceived,
        RNGResponseTimedOut
    }

    struct Game {
        GameState state;
        IERC20 token;
        uint256 maxEndTimestamp;
        bytes32 ticketsMerkleRoot;
        uint32 generatedRandomNumber;
    }

    mapping (uint256 => Game) public storedGames;

    function computeTicketHash(
        address player,
        uint32 minResult,
        uint32 maxResult,
        uint256 payout
    )
        internal
        pure
        returns (
            bytes32
        )
    {
        return keccak256(
            abi.encodePacked(
                player,
                minResult,
                maxResult,
                payout
            )
        );
    }

}
