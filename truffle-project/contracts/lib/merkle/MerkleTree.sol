/*
  Copyright 2018 Edward Grech <dwardu@gmail.com>
*/
pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/MerkleProof.sol";


/// @title Merkle Tree library
/// @author Edward Grech
library MerkleTree {

    function verifyProof(bytes32[] _proof, bytes32 _root, bytes32 _leaf) internal pure returns (bool) {
        return MerkleProof.verifyProof(_proof, _root, _leaf);
    }

    /// @notice Computes the root of a Merkle tree
    /// @param leaves List of 1 or more distinct tree leaves, sorted ascending.
    /// @dev This function is only "pure" with respect to EVM storage. The elements in the passed
    /// memory array itself will be overwritten.
    /// Algorithm based on https://github.com/raiden-network/raiden/blob/master/raiden/transfer/merkle_tree.py
    /// Result compatible with https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/MerkleProof.sol
    /// @return The root of the Merkle tree with the passed leaves.
    function computeMerkleRoot(bytes32[] leaves, bool preserveLeaves) internal pure returns (bytes32 root) {
        uint256 i;

        // When building a Merkle-tree, it might be desirable to want to sort and de-duplicate the leaves
        // so that the same set of leaves always results in the same Merkle-root.
        // Alternatively, to consume less gas, we could *require* the input to be passed sorted and de-duplicated.
        // This can be achieved in one pass by confirming that all pairs of subsequent leaves
        // are always ordered correctly.
        // But apart from consuming some gas too, this could be perfectly done *outside* this function.
        // Therefore, we don't do anything and *assume* the leaves are distinct.
        // In other words, we transfer this responsibility to the caller.
        // Since we are in Solidity, the caller can always be audited to check that it is calling this function
        // with a distinct set of leaves.

        bytes32[] memory currLayer = leaves;
        uint256 nCurr = leaves.length;

        // If it is required to leave the original input array intact, then we allocate a new array
        // that we can use during the computation.
        // Note that the copy only needs to be ceil(leaves.length / 2) element long.
        // Otherwise we just peform the computation in-place in the original array.
        bytes32[] memory nextLayer = preserveLeaves ? new bytes32[]((nCurr + 1) / 2) : leaves;
        uint256 nNext;

        while (1 < nCurr) {

            // Split in half, rounding down.
            // If there is an extra unpaired element at the end of the current layer,
            // for now we are not accounting it in `nNext`, but we will account for it later.
            nNext = nCurr / 2;

            // Loop over all paired elements
            for (i = 0; i < nNext; i++) {
                bytes32 a = currLayer[2 * i];
                bytes32 b = currLayer[2 * i + 1];
                nextLayer[i] = keccak256(a < b ? abi.encodePacked(a, b) : abi.encodePacked(b, a));
            }

            // If there's an extra (unpaired) element at the end of the current layer,
            // append it to the end of the next layer.
            if (nCurr % 2 == 1) {
                nextLayer[++nNext - 1] = currLayer[nCurr - 1];
            }

            // Prepare for next iteration
            currLayer = nextLayer;
            nCurr = nNext;
        }

        return currLayer[0];
    }

    /// @notice Computes the root of a Merkle tree without minimum checks to save gas.
    /// @dev The input array elements will be assumed to be distinct, but the function will not revert if this is not the case.
    /// Also, the input array will be written over.
    function computeMerkleRoot(bytes32[] leaves) internal pure returns (bytes32 root) {
        return computeMerkleRoot(leaves, false);
    }

}
