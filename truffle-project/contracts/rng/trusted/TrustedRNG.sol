pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "../RNG.sol";


contract TrustedRNG is RNG {

    string constant REASON_MSG_SENDER_UNAUTHORIZED = "REASON_MSG_SENDER_UNAUTHORIZED";

    address public trustedOwner;

    constructor(IRNGClient _client, address _trustedOwner) RNG(_client) public {
        trustedOwner = _trustedOwner;
    }

    event TrustedRNGRequest(uint256 requestId);

    function handleRequestFromClient(uint256 _requestId) internal {
        emit TrustedRNGRequest(_requestId);
    }

    function handleTrustedRNGResponse(uint256 requestId, uint32 number) external {
        require(msg.sender == trustedOwner, REASON_MSG_SENDER_UNAUTHORIZED);
        sendResponseToClient(requestId, number);
    }

}
