/*
  Copyright 2018 Edward Grech <dwardu@gmail.com>
*/
import assert from 'assert'
import { keccak256, toBuffer, bufferToHex } from 'ethereumjs-util'
import { containsDuplicates } from './arrays'

const calcOrderedHashBuffer32 = (buffer1, buffer2) =>
  keccak256(Buffer.concat([buffer1, buffer2].sort(Buffer.compare)))

const buildMerkleTreeBuffer32 = leaves => {
  if (leaves.length === 1) {
    const [root] = leaves
    return { root, proofs: [[]] }
  } else {
    const midpoint = 2 ** Math.ceil(Math.log2(leaves.length)) / 2
    const { root: subRootL, proofs: subProofsL } = buildMerkleTreeBuffer32(
      leaves.slice(0, midpoint)
    )
    const { root: subRootR, proofs: subProofsR } = buildMerkleTreeBuffer32(leaves.slice(midpoint))
    const root = calcOrderedHashBuffer32(subRootL, subRootR)
    const proofs = Array.prototype.concat(
      subProofsL.map(subProofL => subProofL.concat(subRootR)),
      subProofsR.map(subProofR => subProofR.concat(subRootL))
    )
    return { root, proofs }
  }
}

const verifyMerkleProofBuffer32 = (root, leaf, proof) =>
  proof.reduce(calcOrderedHashBuffer32, leaf).equals(root)

const isBuffer32 = leaf => Buffer.isBuffer(leaf) && leaf.length === 32

export const buildMerkleTree = hexLeaves => {
  const leaves = hexLeaves.map(toBuffer)
  assert(leaves.length > 0, 'Tree must have at least 1 leaf')
  assert(leaves.every(isBuffer32), 'All leaves must be 32-byte Buffer objects')
  assert(!containsDuplicates(leaves, Buffer.compare), 'Some leaves are duplicate')
  const { root, proofs } = buildMerkleTreeBuffer32(leaves)
  const hexRoot = bufferToHex(root)
  const hexProofs = proofs.map(proof => proof.map(bufferToHex))
  return { root: hexRoot, proofs: hexProofs }
}

// Note: Arguments are ordered to match existing Solidity function
export const verifyMerkleProof = (hexProof, hexRoot, hexLeaf) => {
  const [root, leaf, proof] = [toBuffer(hexRoot), toBuffer(hexLeaf), hexProof.map(toBuffer)]
  assert(isBuffer32(root))
  assert(isBuffer32(leaf))
  assert(proof.every(isBuffer32))
  return verifyMerkleProofBuffer32(root, leaf, proof)
}
