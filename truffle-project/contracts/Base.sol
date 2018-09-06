pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

import "openzeppelin-solidity/contracts/cryptography/MerkleTree.sol";

import "./lib/OwnerCanReclaimEther.sol";
import "./lib/safemath/SafeMathUint256.sol";
import "./lib/safemath/SafeMathUint32.sol";
import "./lib/Signatures.sol";

import "./Bets.sol";


/// @dev Contains the shared state.
contract Base is OwnerCanReclaimEther {

    using SafeMathUint256 for uint256;
    using Signatures for Signatures.Signature;
    using Bets for Bets.Params;
    using SafeERC20 for IERC20;

    // // ToDo: Restrict to 32 bytes or below
    // string constant REASON_CANNOT_PLACE_KNOWN_BET = "REASON_CANNOT_PLACE_KNOWN_BET";
    // string constant REASON_CANNOT_CANCEL_PREVIOUSLY_MATCHED_BET = "REASON_CANNOT_CANCEL_PREVIOUSLY_MATCHED_BET";
    // string constant REASON_ERC20_FAILED_TRANSFER_FROM = "REASON_ERC20_FAILED_TRANSFER_FROM";

    /// @dev Purposely non-payable, to reject Ether that players might be
    /// tempted to send to the contract.
    function() external {
        // ToDo: Revert?
    }


    enum BetState {
        /// @dev Never seen on the blockchain
        Unknown,

        /// @dev Blocked before it could ever be placed
        Blocked,

        /// @dev Bet is placed on blockchain, and stake has been
        /// transferred to this contract.
        Placed,

        /// @dev A placed bet that was cancelled, and the stake
        /// returned to the owner.
        Cancelled,
        
        Matched,
        Claimed,
        Refunded
    }

    /// @dev We prefix this Stored to make it clear that this is the only
    /// bet data that is actually stored in contract storage.
    /// We suffix it Info to show that it is information about the bet,
    /// and not the complete bet data itself.
    struct StoredBetInfo {
        BetState state;
        uint248 matchedGameId;
    }

    mapping (bytes32 => StoredBetInfo) public storedBetInfos;

    // function getStoredBetInfo(address betOwner, bytes32 betId) public view returns (BetState state, bytes31 matchedGameId) {
    //     bytes32 betKey = keccak256(abi.encodePacked(betOwner, betId));
    //     StoredBetInfo storage storedBetInfo = storedBetInfos[betKey];
    //     return (storedBetInfo.state, storedBetInfo.matchedGameId);
    // }

    function getPlayerBetStorage(address player, bytes32 betId) internal view returns (StoredBetInfo storage) {
        return storedBetInfos[keccak256(abi.encodePacked(player, betId))];
    }

}
