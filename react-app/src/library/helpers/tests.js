import expect from './expect-using-bn'
import { zip } from './arrays'

// Adapted from https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/helpers/assertRevert.js
export const expectRevert = async (promise, expectedReason) => {
  try {
    await promise
  } catch (error) {
    if (expectedReason) {
      const { reason } = error
      expect(reason).to.be.equal(expectedReason)
    } else {
      expect(error.message).to.include('revert', `Expected "revert", got ${error} instead`)
    }
    return
  }
  expect.fail('Expected revert not received')
}

const toString = obj => obj.toString()

export const expectLogToBeEqual = ({ event, args }, expectedName, expectedArgs = {}) => {
  expect(event, 'name').to.be.equal(expectedName)
  for (const [k, expectedValue] of Object.entries(expectedArgs)) {
    const { [k]: value } = args
    const argName = `${event}.${k}`
    if (Array.isArray(expectedValue)) {
      expect(value.map(toString), argName).to.deep.equal(expectedValue.map(toString))
    } else {
      expect(value.toString(), argName).to.be.equal(expectedValue.toString())
    }
  }
  return args
}

export const expectLogsToBeEqual = (logs, expectedNameArgs) => {
  expect(logs, 'logs').to.have.lengthOf(expectedNameArgs.length)
  const allArgs = []
  for (const [log, [expectedName, expectedArgs = {}]] of zip(logs, expectedNameArgs)) {
    allArgs.push(expectLogToBeEqual(log, expectedName, expectedArgs))
  }
  return allArgs
}
