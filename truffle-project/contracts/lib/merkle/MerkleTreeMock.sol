pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./MerkleTree.sol";


/// @title Wrapper around the MerkleTree library, so that during tests we have
/// something concrete we can attach the library to, that we can actually instantiate.
contract MerkleTreeMock {

    function verifyProof(bytes32[] _proof, bytes32 _root, bytes32 _leaf) public pure returns (bool) {
        return MerkleTree.verifyProof(_proof, _root, _leaf);            
    }

    function computeMerkleRoot(bytes32[] leaves, bool preserveLeaves) public pure returns (bytes32 root) {
        return MerkleTree.computeMerkleRoot(leaves, preserveLeaves);
    }

    function computeMerkleRoot(bytes32[] leaves) public pure returns (bytes32 root) {
        return MerkleTree.computeMerkleRoot(leaves);
    }

}
