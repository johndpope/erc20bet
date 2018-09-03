pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/ownership/HasNoEther.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";

import "./_StandardToken.sol";


/// @title A lot of free beer.
contract BeerToken is _StandardToken, DetailedERC20("BeerToken", "🍺", 0), HasNoEther {

    /// @notice 10 free beers may be claimed by sending a 0-value
    /// transaction to this contract.
    /// @dev We omit `payable` so that the contract cannot receive ether.
    function() external {
        _mint(msg.sender, 10);
    }

}
