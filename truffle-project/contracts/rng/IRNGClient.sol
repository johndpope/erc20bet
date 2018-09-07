pragma solidity ^0.4.24;
pragma experimental "v0.5.0";


interface IRNGClient {

    function handleRNGResponse(uint256 requestId, uint32 number) external;

}
