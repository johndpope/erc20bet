pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./UsingBetStorage.sol";
import "./UsingWETH.sol";


contract SupportingPlace is UsingBetStorage, UsingWETH {

    string constant REASON_ONLY_UNKNOWN_BET_CAN_BE_PLACED = "REASON_ONLY_UNKNOWN_BET_CAN_BE_PLACED";

    event BetPlaced(
        /// @dev Indexed so that a player can search for
        /// bets he might have placed.
        address indexed owner,

        /// @dev It can be useful to be able to search
        /// for bets by their unique id.
        bytes32 indexed betId,

        /// @dev Indexed so that someone can watch the
        /// blockchain for bets in a particular ERC-20 token.
        address indexed token,

        /// The remaining fields constitute the
        /// terms of the bet, and are not indexed.
        uint256 stake,
        uint256 payout,
        uint32 prob,
        uint256 expiry,
        uint256 nonce
    );

    /// @notice Place a bet on the blockchain.
    /// @dev This will attribute the bet to `msg.sender`. Later, when it is matched,
    /// there will be no need for it to be signed with a further ECDSA signature.
    function placeBet(
        IERC20 token,
        uint256 stake,
        uint256 payout,
        uint32 prob,
        uint256 expiry,
        uint256 nonce
    )
        public
    {
        address player = msg.sender;
        
        (bytes32 betId,) = computeBetIdBetHashPair({
            player: player,
            token: token,
            stake: stake,
            payout: payout,
            prob: prob,
            expiry: expiry,
            nonce: nonce
        });
        
        StoredBetInfo storage storedBetInfo = getPlayerBetStorage(player, betId);
        require(storedBetInfo.state == BetState.Unknown, REASON_ONLY_UNKNOWN_BET_CAN_BE_PLACED);
        storedBetInfo.state = BetState.Placed;

        // ToDo: Split placeBet into 2 functions, so we don't have to read address from
        // storage and test it every time.
        // and check check every time
        if (address(token) == address(storedWETHToken)) {
            // ToDo: Analyse well for reentrancy
            storedWETHToken.deposit.value(stake)();
        } else {
            token.safeTransferFrom({
                _from: player,
                _to: address(this),
                _value: stake
            });
        }
        emit BetPlaced({
            owner: player,
            betId: betId,
            token: token,
            stake: stake,
            payout: payout,
            prob: prob,
            expiry: expiry,
            nonce: nonce
        });
    }

    /// @notice Send the stake in Ether to this function to place a bet
    /// in WETH. This contract does not hold any Ether, but they are
    /// deposited directly to WETH token contract.
    function placeBet(
        uint256 payout,
        uint32 prob,
        uint256 expiry,
        uint256 nonce
    )
        external
        payable
    {
        placeBet({
            token: storedWETHToken,
            stake: msg.value,
            payout: payout,
            prob: prob,
            expiry: expiry,
            nonce: nonce
        });
    }

}
