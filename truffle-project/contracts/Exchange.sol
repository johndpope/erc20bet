pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./lib/OwnerCanReclaimEther.sol";

import "./SupportingBlock.sol";
import "./SupportingCancel.sol";
import "./SupportingClaim.sol";
import "./SupportingMatch.sol";
import "./SupportingPlace.sol";


contract Exchange is
    OwnerCanReclaimEther,
    SupportingBlock,
    SupportingCancel,
    SupportingClaim,
    SupportingMatch,
    SupportingPlace
{

    constructor(IRNGFactory rngFactory, WrappedETHToken wethToken) UsingRNG(rngFactory) UsingWETH(wethToken) public {
    }

    /// @dev Purposely non-payable, to reject Ether that players might be
    /// tempted to send to the contract.
    function() external {
        // ToDo: Revert?
    }


}
