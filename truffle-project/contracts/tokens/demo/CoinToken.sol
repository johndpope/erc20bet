pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

import "../../lib/OwnerCanReclaimEther.sol";


/// @title A standard token with 21,000,000 COIN initially allocated to the token creator.
contract CoinToken is ERC20, ERC20Detailed("CoinToken", "COIN", 18), OwnerCanReclaimEther {

    uint256 constant TOTAL_SUPPLY = 21 * 10 ** 6 * 10 ** 18;

    constructor() public {
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    /// @dev Disallows direct send by setting a default function without the `payable` flag.
    function() external {
    }

}
