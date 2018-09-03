pragma solidity ^0.4.24;

// import "openzeppelin-solidity/contracts/ECRecovery.sol";


library Signatures {

    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function isValid(Signature self, bytes32 hash, address supposedSigner) internal pure returns (bool) {
        return supposedSigner == ecrecover(
            // ECRecovery.toEthSignedMessageHash(hash),
            hash,
            self.v,
            self.r,
            self.s
        );
    }

    function isEmpty(Signature self) internal pure returns (bool) {
        return self.v == 0 && self.r == 0 && self.s == 0;
    }

}
