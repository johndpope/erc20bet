pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


library Bets {

    using Bets for Params;

    using SafeERC20 for IERC20;

    struct Params {
        IERC20 token;
        uint256 stake;
        uint256 payout;
        uint32 prob;
        uint256 expiry;
        uint256 nonce;
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

    function getHash(Params self) internal view returns (bytes32 betHash) {
        return keccak256(
            abi.encodePacked(
                self.token,
                self.stake,
                self.payout,
                self.prob,
                self.expiry,
                self.nonce,
                address(this)
            )
        );
    }

    /// @dev ToDo: Bring this up to date with EIP-712
    function getHashForSigning(Params self) internal view returns (bytes32 hashForSigning) {
        return keccak256(abi.encodePacked(TYPES_HASH, self.getHash()));
    }

    function getIdForPlayer(Params self, address player) internal view returns (bytes32 betId) {
        return keccak256(abi.encodePacked(player, self.getHash()));
    }

    function getMappingKeyForPlayer(Params self, address player) internal view returns (bytes32 betKey) {
        return keccak256(abi.encodePacked(player, self.getIdForPlayer(player)));
    }

    function getIdAndMappingKeyForPlayer(Params self, address player)
        internal
        view
        returns (
            bytes32 betId,
            bytes32 betKey
        )
    {
        betId = self.getIdForPlayer(player);
        betKey = keccak256(abi.encodePacked(player, betId));
    }

    function untrustedSafeTransferStakeFromPlayer(Params self, address player) internal {
        self.token.safeTransferFrom({ _from: player, _to: address(this), _value: self.stake });
    }

    function untrustedSafeTransferStakeBackToPlayer(Params self, address player) internal {
        self.token.safeTransfer({ _to: player, _value: self.stake });
    }

}
