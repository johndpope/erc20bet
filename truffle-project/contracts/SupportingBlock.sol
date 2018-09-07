pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./UsingBetStorage.sol";


contract SupportingBlock is UsingBetStorage {

    string constant REASON_ONLY_UNKNOWN_BET_CAN_BE_BLOCKED = "REASON_ONLY_UNKNOWN_BET_CAN_BE_BLOCKED";
    
    event BlockedUnknownBet(
        address indexed player,
        bytes32 indexed betId
    );

    function blockUnknownBet(bytes32 betId) external {
        address player = msg.sender;
        StoredBetInfo storage storedBetInfo = getPlayerBetStorage(player, betId);
        require(storedBetInfo.state == BetState.Unknown, REASON_ONLY_UNKNOWN_BET_CAN_BE_BLOCKED);
        storedBetInfo.state = BetState.Blocked;
        emit BlockedUnknownBet(player, betId);
    }

}
