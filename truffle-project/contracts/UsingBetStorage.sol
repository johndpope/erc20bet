pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

import "./lib/SafeMathUint256.sol";
import "./lib/Signatures.sol";


/// @dev Contains the shared state.
contract UsingBetStorage {

    using SafeERC20 for IERC20;

    using SafeMathUint256 for uint256;
    using Signatures for Signatures.Signature;

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

    function getPlayerBetStorage(address player, bytes32 betId) internal view returns (StoredBetInfo storage) {
        return storedBetInfos[keccak256(abi.encodePacked(player, betId))];
    }

    /// @dev Just for informational purposes and testing.
    function getBetInfo(bytes32 betId) external view returns (BetState state, uint256 matchedGameId) {
        StoredBetInfo storage storedBetInfo = getPlayerBetStorage(msg.sender, betId);
        state = storedBetInfo.state;
        matchedGameId = storedBetInfo.matchedGameId;
    }

    bytes32 private constant TYPES_HASH = keccak256(
        abi.encodePacked(
            "address token",
            "uint256 stake",
            "uint256 payout",
            "uint32 prob",
            "uint256 expiry",
            "uint256 nonce",
            "address betContract"
        )
    );

    /// @dev ToDo: Bring this up to date with EIP-712
    /// This function doesn't need to be `public`, it can be `internal`, but we expose it
    /// to facilitate testing.
    /// This function is `view` only because it accesses the contract address to compute the
    /// hashes - this is done to guard against cross-chain replay attacks.
    /// @return betId - The bet ID
    /// @return betHash - The bet hash that is signed in the client for gas-free transactions
    function computeBetIdBetHashPair(
        address player,
        IERC20 token,
        uint256 stake,
        uint256 payout,
        uint32 prob,
        uint256 expiry,
        uint256 nonce
    )
        public
        view
        returns (
            bytes32 betId,
            bytes32 betHash
        )
    {
        bytes32 valuesHash = keccak256(
            abi.encodePacked(
                address(token),
                stake,
                payout,
                prob,
                expiry,
                nonce,
                address(this)
            )
        );
        betId = keccak256(abi.encodePacked(player, valuesHash));
        betHash = keccak256(abi.encodePacked(TYPES_HASH, valuesHash));
    }

}
