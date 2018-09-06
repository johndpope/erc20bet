pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./Base.sol";


contract BetCancellation is Base {

    string constant REASON_ONLY_PLACED_BET_CAN_BE_CANCELLED = "REASON_ONLY_PLACED_BET_CAN_BE_CANCELLED";

    event CancelledPlacedBet(
        address indexed player,
        bytes32 indexed betId
    );

    /// @notice Cancel a bet and return stake to player.
    /// If this tx succeeds, it will not be possible to place the same bet ever again.
    function cancelPlacedBet(bytes32 betId, IERC20 token, uint256 stake) external {
        address player = msg.sender;
        StoredBetInfo storage playerBetStorage = getPlayerBetStorage(player, betId);
        require(playerBetStorage.state == BetState.Placed, REASON_ONLY_PLACED_BET_CAN_BE_CANCELLED);
        playerBetStorage.state = BetState.Cancelled;
        token.safeTransfer({ _to: player, _value: stake });
        emit CancelledPlacedBet(player, betId);
    }

}
