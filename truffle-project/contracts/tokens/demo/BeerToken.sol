pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

import "../../lib/OwnerCanReclaimEther.sol";


/// @title A lot of free beer.
contract BeerToken is ERC20, ERC20Detailed("BeerToken", "🍺", 0), OwnerCanReclaimEther {

    /// @notice 10 free beers may be claimed by sending a 0-value
    /// transaction to this contract.
    /// @dev Disallows direct send by setting a default function without the `payable` flag.
    function() external {
        _mint(msg.sender, 10);
    }

}
