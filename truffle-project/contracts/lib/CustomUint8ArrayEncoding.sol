pragma solidity ^0.4.24;
pragma experimental "v0.5.0";


library CustomUint8ArrayEncoding {

    /// @dev Decodes a bytes packed into a bytes32
    /// @param encoded - byte 0 is the length `n`, bytes 1 ... n  are the bytes
    /// @return A bytes object with the correct data and elements set
    /// @dev An example:
    /// encoded =
    /// 0511223344550000000000000000000000000000000000000000000000000000
    ///
    /// We read the first byte, 0x05, which is the length.
    /// We create a bytes(5)
    /// In memory this is represented as                                
    /// 0000000000000000000000000000000000000000000000000000000000000005,0000000000000000000000000000000000000000000000000000000000000000
    ///                                                               05,11223344550000000000000000000000000000000000000000000000000000
    ///                                                               ^^^^^^
    ///                                                               We copy our 32 bytes here. That is why we copy our bytes32 to
    ///                                                               location 31, it is the last byte of the length 32-byte slot.
    function decodeBytes32(bytes32 encoded) internal pure returns (bytes decoded) {
        decoded = new bytes(uint8(encoded[0]));
        assembly {
            mstore(add(decoded, 31), encoded)
        }
    }

}
