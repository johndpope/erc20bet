pragma solidity ^0.4.24;
pragma experimental "v0.5.0";


interface IRNG {

    function sendRNGRequest(uint256 requestId) external;

}
