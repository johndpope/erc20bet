pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract OwnerCanReclaimEther is Ownable {

    /// @dev Transfer all Ether held by the contract to the owner.
    function reclaimEther() external onlyOwner {
        owner.transfer(address(this).balance);
    }

}
