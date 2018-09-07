pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "../IRNGFactory.sol";

import "./TrustedRNG.sol";


contract TrustedRNGFactory is IRNGFactory {

    address trustedOwner;

    constructor() public {
        trustedOwner = msg.sender;
    }

    /// @dev Creates a TrustedRNG that can only be called by the owner of this factory.
    function createRNG(IRNGClient client) public returns (IRNG rng) {
        return new TrustedRNG({
            _client: client,
            _trustedOwner: trustedOwner
        });
    }

}
