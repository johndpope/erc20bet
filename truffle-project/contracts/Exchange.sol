pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./Base.sol";
import "./BetBlockage.sol";
import "./BetPlacement.sol";
import "./BetCancellation.sol";
import "./BetMatching.sol";
import "./BetClaiming.sol";


contract Exchange is
    BetBlockage,
    BetPlacement,
    BetCancellation,
    BetMatching,
    BetClaiming
{

    constructor(IRNGFactory rngFactory, WrappedETHToken wethToken) UsesRNG(rngFactory) UsesWETH(wethToken) public {
    }

}
