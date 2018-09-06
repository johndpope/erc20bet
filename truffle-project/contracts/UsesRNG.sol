pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./rng/IRNGFactory.sol";
import "./rng/IRNGClient.sol";


contract UsesRNG is IRNGClient {

    IRNG public storedRNG;

    constructor(IRNGFactory rngFactory) internal {
        storedRNG = rngFactory.createRNG({ client: this });
    }

}
