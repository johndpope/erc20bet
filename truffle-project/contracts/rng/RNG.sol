pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./IRNG.sol";
import "./IRNGClient.sol";
import "./IRNGFactory.sol";


/// @title An abstract RNG that is bound to a client at construction-time.
contract RNG is IRNG {

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

    IRNGClient public client;

    constructor(IRNGClient _client) internal {
        factory = msg.sender;
        client = _client;
    }

    function sendRNGRequest(uint256 _requestId) public {
        require(msg.sender == address(client));
        require(requestStates[_requestId] == RequestState.RequestNeverReceived);
        requestStates[_requestId] = RequestState.RequestReceived;
        handleRNGRequest(_requestId);
    }

    function handleRNGRequest(uint256 _requestId) internal;

    function sendRNGResponse(uint256 _requestId, uint32 _number) internal {
        require(requestStates[_requestId] == RequestState.RequestReceived);
        requestStates[_requestId] = RequestState.ResponseSent;
        client.handleRNGResponse(_requestId, _number);
    }

}
