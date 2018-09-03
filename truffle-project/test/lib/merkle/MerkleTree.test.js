import { bufferToHex, keccak256 } from 'ethereumjs-util'
import { buildMerkleTree } from '../../../helpers/merkle-trees'
import { zip, integers } from '../../../helpers/arrays'

const MerkleTreeMock = artifacts.require('MerkleTreeMock')

const bufferToHexOfkeccak256 = input => bufferToHex(keccak256(input))

contract('MerkleTree', () => {
  before(async function() {
    this.merkleTreeContract = await MerkleTreeMock.new()
  })

  describe('verifyProof', () => {
    it('should return true for a valid Merkle proof', async function() {
      const elements = ['a', 'b', 'c', 'd']
      const leaves = elements.map(bufferToHexOfkeccak256)
      const { root, proofs } = buildMerkleTree(leaves)
      const [leaf0, proof0] = zip(leaves, proofs)[0]
      const result = await this.merkleTreeContract.verifyProof(proof0, root, leaf0)
      assert.isOk(result, 'verifyProof did not return true for a valid proof')
    })

    it('should return false for an invalid Merkle proof', async function() {
      const correctElements = ['a', 'b', 'c']
      const correctLeaves = correctElements.map(bufferToHexOfkeccak256)
      const { root: correctRoot } = buildMerkleTree(correctLeaves)
      const badElements = ['d', 'e', 'f']
      const badLeaves = badElements.map(bufferToHexOfkeccak256)
      const { proofs: badProofs } = buildMerkleTree(badLeaves)
      const [correctLeaf0, badProof0] = zip(correctLeaves, badProofs)[0]
      const result = await this.merkleTreeContract.verifyProof(badProof0, correctRoot, correctLeaf0)
      assert.isNotOk(result, 'verifyProof did not return false for an invalid proof')
    })

    it('should return false for a Merkle proof of invalid length', async function() {
      const elements = ['a', 'b', 'c']
      const leaves = elements.map(bufferToHexOfkeccak256)
      const { root, proofs } = buildMerkleTree(leaves)
      const [leaf0, proof0] = zip(leaves, proofs)[0]
      const badProof0 = proof0.slice(0, proof0.length - 5)
      const result = await this.merkleTreeContract.verifyProof(badProof0, root, leaf0)
      assert.isNotOk(result, 'verifyProof did not return false for proof of invalid length')
    })
  })

  describe('computeMerkleRoot', () => {
    const testComputeMerkleRoot = n => {
      describe(`when called with ${n} leaves`, () => {
        before(async function() {
          const elements = integers(n)
          this.leaves = elements.map(bufferToHexOfkeccak256)
          this.rootSolidity = await this.merkleTreeContract.computeMerkleRoot(this.leaves)
          const { root, proofs } = buildMerkleTree(this.leaves)
          this.rootJavaScript = root
          this.proofs = proofs
        })

        it('should compute the same result as the JavaScript implementation', async function() {
          expect(this.rootSolidity).to.be.equal(this.rootJavaScript)
        })

        it(`should produce a root that for any of the ${n} leaves can be verified using on-chain MerkleProof.verifyProof()`, async function() {
          const verifications = await Promise.all(
            zip(this.leaves, this.proofs).map(([leaf, proof]) =>
              this.merkleTreeContract.verifyProof(proof, this.rootSolidity, leaf)
            )
          )
          assert(verifications.every(v => v))
        })
      })
    }

    for (let n = 1; n <= 8; n++) {
      testComputeMerkleRoot(n)
    }
  })
})
