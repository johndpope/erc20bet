pragma solidity ^0.4.24;
pragma experimental "v0.5.0";


library SafeMathUint256 {

    uint8 private constant MAX_UINT8 = 2 ** 8 - 1;

    uint32 private constant MAX_UINT32 = 2 ** 32 - 1;

    uint160 private constant MAX_UINT160 = 2 ** 160 - 1;

    uint248 private constant MAX_UINT248 = 2 ** 248 - 1;

    function safeAdd(uint256 a, uint256 b) internal pure returns (uint256 c) {
        c = a + b;
        assert(c >= a);
        return c;
    }

    function safeToUint8(uint256 a) internal pure returns (uint8) {
        require(a <= MAX_UINT8);
        return uint8(a);
    } 

    function safeToUint32(uint256 a) internal pure returns (uint32) {
        require(a <= MAX_UINT32);
        return uint32(a);
    }

    function safeToUint160(uint256 a) internal pure returns (uint160) {
        require(a <= MAX_UINT160);
        return uint160(a);
    }

    function safeToUint248(uint256 a) internal pure returns (uint248) {
        require(a <= MAX_UINT248);
        return uint248(a);
    }

}
