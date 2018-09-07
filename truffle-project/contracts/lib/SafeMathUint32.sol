pragma solidity ^0.4.24;
pragma experimental "v0.5.0";


library SafeMathUint32 {

    function safeAdd(uint32 a, uint32 b) internal pure returns (uint32 c) {
        c = a + b;
        assert(c >= a);
        return c;
    }

}
