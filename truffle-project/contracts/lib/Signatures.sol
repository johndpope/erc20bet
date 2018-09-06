pragma solidity ^0.4.24;

// import "openzeppelin-solidity/contracts/ECRecovery.sol";


library Signatures {

    using Signatures for Signatures.Signature;

    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function recoverSignerForHash(Signature self, bytes32 hash_) internal pure returns (address signer) {
        return ecrecover(
            // ECRecovery.toEthSignedMessageHash(hash_),
            hash_,
            self.v,
            self.r,
            self.s
        );
    }

    function isValid(Signature self, bytes32 hash_, address supposedSigner) internal pure returns (bool) {
        return self.recoverSignerForHash(hash_) == supposedSigner;
    }

    function isEmpty(Signature self) internal pure returns (bool) {
        return self.v == 0 && self.r == 0 && self.s == 0;
    }

}
