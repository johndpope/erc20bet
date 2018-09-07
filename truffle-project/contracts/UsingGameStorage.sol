pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/cryptography/MerkleTree.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract UsingGameStorage {

    using SafeERC20 for IERC20;

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
