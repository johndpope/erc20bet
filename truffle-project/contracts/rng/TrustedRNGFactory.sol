pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./IRNG.sol";
import "./IRNGFactory.sol";
import "./TrustedRNG.sol";


contract TrustedRNGFactory is IRNGFactory {

    function createRNG(IRNGClient client) public returns (IRNG rng) {
        return new TrustedRNG({
            _client: client,
            _trustedOwner: msg.sender
        });
    }

}
