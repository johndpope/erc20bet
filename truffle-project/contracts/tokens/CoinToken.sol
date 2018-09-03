pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/ownership/HasNoEther.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";

import "./_StandardToken.sol";


/// @title A standard token with 21,000,000 COIN initially allocated to the token creator.
contract CoinToken is _StandardToken, DetailedERC20("CoinToken", "COIN", 18), HasNoEther {

    uint256 constant TOTAL_SUPPLY = 21 * 10 ** 6 * 10 ** 18;

    constructor() public {
        _mint(msg.sender, TOTAL_SUPPLY);
    }

}
