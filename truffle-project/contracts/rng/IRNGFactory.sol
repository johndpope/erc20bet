pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./IRNG.sol";
import "./IRNGClient.sol";


interface IRNGFactory {

    function createRNG(IRNGClient client) external returns (IRNG rng);

}
