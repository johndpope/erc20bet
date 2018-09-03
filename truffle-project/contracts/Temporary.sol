/*

  Copyright 2018 Edward Grech.

*/

pragma solidity ^0.4.24;

import "./lib/Signatures.sol";

contract Temporary {

    using Signatures for Signatures.Signature;

    bytes32 constant TYPES_HASH = keccak256(
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

    function calcBetHash(
        address token,
        uint256 stake,
        uint256 payout,
        uint32 prob,
        uint256 expiry,
        uint256 nonce
    )
        public
        view
        returns (bytes32 betHash)
    {
        return keccak256(
            abi.encodePacked(token, stake, payout, prob, expiry, nonce, address(this))
        );
    }

    function calcBetKey(
        address owner,
        address token,
        uint256 stake,
        uint256 payout,
        uint32 prob,
        uint256 expiry,
        uint256 nonce
    )
        public
        view
        returns (bytes32 betKey)
    {
        bytes32 betHash = keccak256(abi.encodePacked(token, stake, payout, prob, expiry, nonce, address(this)));
        bytes32 betId = keccak256(abi.encodePacked(owner, betHash));
        betKey = keccak256(abi.encodePacked(owner, betId));
    }

    function testRevertReason() external {
        require(false, "Xi żball!");
    }

    function recoverBetOwner(
        address token,
        uint256 stake,
        uint256 payout,
        uint32 prob,
        uint256 expiry,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        public
        view
        returns (bool isMsgSender)
    {
        // Mirrors typedSignatureHash() @ https://github.com/MetaMask/eth-sig-util/blob/master/index.js#L247
        bytes32 hash = keccak256(
            abi.encodePacked(
                TYPES_HASH,
                keccak256(
                    abi.encodePacked(
                        token,
                        stake,
                        payout,
                        prob,
                        expiry,
                        nonce,
                        address(this)
                    )
                )
            )
        );
        return ecrecover(hash, v, r, s) == msg.sender;
    }

    function recoverBetOwner2(
        address token,
        uint256 stake,
        uint256 payout,
        uint32 prob,
        uint256 expiry,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        public
        view
        returns (bool isMsgSender)
    {
        Signatures.Signature memory sig = Signatures.Signature({v: v, r: r, s: s});
        bytes32 betHash = keccak256(
            abi.encodePacked(
                token,
                stake,
                payout,
                prob,
                expiry,
                nonce,
                address(this)
            )
        );
        return sig.isValid(keccak256(abi.encodePacked(TYPES_HASH, betHash)), msg.sender);
    }


    function uint2str(uint i) internal pure returns (string){
        if (i == 0) return "0";
        uint j = i;
        uint length;
        while (j != 0){
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint k = length - 1;
        while (i != 0){
            bstr[k--] = byte(48 + i % 10);
            i /= 10;
        }
        return string(bstr);
    }

}
