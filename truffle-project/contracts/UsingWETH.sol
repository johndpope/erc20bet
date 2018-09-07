pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./tokens/WrappedETHToken.sol";


contract UsingWETH {

    WrappedETHToken public storedWETHToken;

    constructor(WrappedETHToken wethToken) internal {
        storedWETHToken = wethToken;
    }

}
