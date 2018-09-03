pragma solidity ^0.4.24;
pragma experimental "v0.5.0";


contract RngClient {

    /// @notice Called *once* when a provably valid result is returned.
    function onRngResponseResult(bytes32 rngRequestId, uint256 result) public;

    /// @notice Called *once* when something's wrong with the returned value, or the request times out.
    function onRngResponseError(bytes32 rngRequestId) public;

}


// solium-disable security/no-block-members
contract Rng {

    // "A constructor set as internal causes the contract to be marked as abstract."
    constructor() internal {
    }

    enum RequestState {
        NeverSent,
        Sent,
        Complete
    }

    struct Request {
        RngClient client;
        RequestState state;
        uint256 maxResponseTimestamp;
    }

    mapping(bytes32 => Request) internal storedRequests;

    function sendRngRequest() internal returns (bytes32 uniqueRngRequestId);

    function sendRequest(uint256 maxResponseTimestamp) public returns (bytes32 uniqueRngRequestId) {
        require(block.timestamp < maxResponseTimestamp, "Cannot issue a RNG request that has already expired");
        uniqueRngRequestId = sendRngRequest();
        Request storage storedRequest = storedRequests[uniqueRngRequestId];
        require(storedRequest.state == RequestState.NeverSent, "Cannot send a RNG request with same ID twice");
        storedRequest.client = RngClient(msg.sender); // ToDo: Is this correct?
        storedRequest.state = RequestState.Sent;
        storedRequest.maxResponseTimestamp = maxResponseTimestamp;
        // emit RequestSent(uniqueRngRequestId);
    }

    /// @notice Just used for testing
    event TestRequestSent(bytes32 uniqueRequestId);

    /// @notice Just used for testing
    function testSendRequest(uint256 maxResponseTimestamp) public {
        emit TestRequestSent(sendRequest(maxResponseTimestamp));
    }

    /// @notice May be called by anyone.
    /// Everyone is free to notify the contract that it has timed out.
    function onRngTimeout(bytes32 rngRequestId) public {
        Request storage storedRequest = storedRequests[rngRequestId];
        require(storedRequest.state == RequestState.Sent);
        require(storedRequest.maxResponseTimestamp < block.timestamp);
        storedRequest.state = RequestState.Complete;
        storedRequest.client.onRngResponseError(rngRequestId);
        // ToDo: Delete storedRequest? (save gas)
    }

    /// @dev Only callable by an inheriting contract.
    function onRngResponseResult(bytes32 rngRequestId, uint256 result) internal {
        Request storage storedRequest = storedRequests[rngRequestId];
        require(storedRequest.state == RequestState.Sent);
        storedRequest.state = RequestState.Complete;
        if (block.timestamp <= storedRequest.maxResponseTimestamp) {
            storedRequest.client.onRngResponseResult(rngRequestId, result);
        } else {
            storedRequest.client.onRngResponseError(rngRequestId);
        }
        // ToDo: Delete storedRequest? (save gas)
    }

    /// @dev Only callable by an inheriting contract.
    function onRngResponseError(bytes32 rngRequestId) internal {
        Request storage storedRequest = storedRequests[rngRequestId];
        require(storedRequest.state == RequestState.Sent);
        storedRequest.state = RequestState.Complete;
        storedRequest.client.onRngResponseError(rngRequestId);
        // ToDo: Delete storedRequest? (save gas)
    }

}
