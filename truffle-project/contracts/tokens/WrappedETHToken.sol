pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";


contract WrappedETHToken is ERC20, ERC20Detailed("WrappedETHToken", "WETH", 18) {

    /// @dev Fallback to calling deposit when ether is sent directly to contract.
    function() external payable {
        deposit();
    }

    /// @dev Buys tokens with Ether, exchanging them 1:1.
    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }

    /// @dev Sells tokens in exchange for Ether, exchanging them 1:1.
    /// @param amount Number of tokens to sell.
    function withdraw(uint amount) public {
        _burn(msg.sender, amount);
    }

}
