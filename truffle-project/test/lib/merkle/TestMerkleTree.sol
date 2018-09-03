pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "truffle/Assert.sol";

import "../../../contracts/lib/merkle/MerkleTree.sol";


contract TestMerkleTree {

    function h(bytes32 x, bytes32 y) internal pure returns (bytes32) {
        return keccak256(x < y ? abi.encodePacked(x, y) : abi.encodePacked(y, x));
    }

    function integers(uint256 n) internal pure returns (bytes32[] array) {
        array = new bytes32[](n);
        for (uint256 i = 0; i < n; i++) {
            array[i] = bytes32(i);
        }
    }

    function confirmResult(uint256 n, bytes32 expectedRoot) internal {
        Assert.equal(MerkleTree.computeMerkleRoot(integers(n)), expectedRoot, "Computed Merkle root does not match expected");
    }   

    function testComputeMerkleRoot1234567() public {
        confirmResult(1, 0);
        confirmResult(2, h(0, 1));
        confirmResult(3, h(h(0, 1), 2));
        confirmResult(4, h(h(0, 1), h(2, 3)));
        confirmResult(5, h(h(h(0, 1), h(2, 3)), 4));
        confirmResult(6, h(h(h(0, 1), h(2, 3)), h(4, 5)));
        confirmResult(7, h(h(h(0, 1), h(2, 3)), h(h(4, 5), 6)));
    }

    function testComputeMerkleRootPreserveLeaves() public {
        bytes32[] memory leaves1 = integers(5);
        bytes32[] memory leaves2 = integers(5);

        bytes32 hashBefore1 = keccak256(abi.encodePacked(leaves1[0], leaves1[1], leaves1[2], leaves1[3], leaves1[4]));
        bytes32 hashBefore2 = keccak256(abi.encodePacked(leaves2[0], leaves2[1], leaves2[2], leaves2[3], leaves2[4]));

        bytes32 root1 = MerkleTree.computeMerkleRoot(leaves1, false);
        bytes32 root2 = MerkleTree.computeMerkleRoot(leaves2, true);
        Assert.equal(root1, root2, "Preserving or not preserving leaf array should not influence result");

        bytes32 hashAfter1 = keccak256(abi.encodePacked(leaves1[0], leaves1[1], leaves1[2], leaves1[3], leaves1[4]));
        bytes32 hashAfter2 = keccak256(abi.encodePacked(leaves2[0], leaves2[1], leaves2[2], leaves2[3], leaves2[4]));

        Assert.notEqual(hashBefore1, hashAfter1, "Leave array expected to be modified if we do not preserve leaves");
        Assert.equal(hashBefore2, hashAfter2, "Leave array expected to be left intact if we preserve leaves");
    }

}
