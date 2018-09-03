# Coding Style

## `pragma experimental "v0.5.0";`

From [Solidity docs: Security Considerations](https://solidity.readthedocs.io/en/v0.4.24/security-considerations.html#take-warnings-seriously):

> Also try to enable the “0.5.0” safety features as early as possible by adding `pragma experimental "v0.5.0";`. Note that in this case, the word experimental does not mean that the safety features are in any way risky, it is just a way to enable some features that are not yet part of the latest version of Solidity due to backwards compatibility.

## Storage variables

All storage variables have are prefixed `stored`. Both contract variables, as well as local `storage` variables. For example:

```
contract A {

    struct Point {
        uint256 x;
        uint256 y;
    }

    bytes32 storedHash;

    Point[] storedPoints;

    function doSomething() public {
        Point[] memory points = new Point[](5);
        Point[] storage storedPoint = storedPoints;
        Point storage storedPoint0 = storedPoints[0];
    }

}

```
