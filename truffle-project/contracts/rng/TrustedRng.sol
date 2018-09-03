pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Rng.sol";


contract TrustedRng is Rng, Ownable {

    event TrustedRngRequest(bytes32 uniqueRngRequestId);

    uint256 private nextRngRequestId = 0xcafebabe;

    function sendRngRequest() internal returns (bytes32 uniqueRngRequestId) {
        uniqueRngRequestId = bytes32(nextRngRequestId++);
        emit TrustedRngRequest(uniqueRngRequestId);
    }

    function triggerResponseResult(bytes32 rngRequestId, uint256 result) external onlyOwner {
        onRngResponseResult(rngRequestId, result);
    }

    function triggerResponseError(bytes32 rngRequestId) external onlyOwner {
        onRngResponseError(rngRequestId);
    }

}
