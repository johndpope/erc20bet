pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./IRNGFactory.sol";
import "./IRNG.sol";


contract UsingRNG is IRNGClient {

    string constant REASON_MSG_SENDER_UNAUTHORIZED = "REASON_MSG_SENDER_UNAUTHORIZED";
    
    IRNG private rng;

    constructor(IRNGFactory _rngFactory) internal {
        rng = _rngFactory.createRNG(this);
    }

    /// @dev Called by extending contract.
    function sendRequestToRNG(uint256 _requestId) internal {
        rng.sendRNGRequest(_requestId);
    }

    /// @dev Called by RNG.
    function handleRNGResponse(uint256 _requestId, uint32 _number) public {
        require(msg.sender == address(rng), REASON_MSG_SENDER_UNAUTHORIZED);
        handleResponseFromRNG(_requestId, _number);
    }

    /// @dev Implemented by extending contract.
    function handleResponseFromRNG(uint256 _requestId, uint32 _number) internal;

}
