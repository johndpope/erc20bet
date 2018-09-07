pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./IRNG.sol";
import "./IRNGClient.sol";
import "./IRNGFactory.sol";


/// @title An abstract RNG that is bound to a client at construction-time.
contract RNG is IRNG {

    string constant REASON_MSG_SENDER_UNAUTHORIZED = "REASON_MSG_SENDER_UNAUTHORIZED";

    /// @dev For reference
    address public factory;

    enum RequestState {
        RequestNeverReceived,
        RequestReceived,
        ResponseSent
    }

    struct Request {
        RequestState state;
        IRNGClient client;
    }

    mapping (uint256 => RequestState) requestStates;

    IRNGClient private client;

    constructor(IRNGClient _client) internal {
        factory = msg.sender;
        client = _client;
    }

    function sendRNGRequest(uint256 _requestId) public {
        require(msg.sender == address(client), REASON_MSG_SENDER_UNAUTHORIZED);
        require(requestStates[_requestId] == RequestState.RequestNeverReceived);
        requestStates[_requestId] = RequestState.RequestReceived;
        handleRequestFromClient(_requestId);
    }

    /// @dev Implemented by extending contract.
    function handleRequestFromClient(uint256 _requestId) internal;

    /// @dev Called by extending contract when random number has been generated.
    function sendResponseToClient(uint256 _requestId, uint32 _number) internal {
        require(requestStates[_requestId] == RequestState.RequestReceived);
        requestStates[_requestId] = RequestState.ResponseSent;
        client.handleRNGResponse(_requestId, _number);
    }

}
