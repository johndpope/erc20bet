pragma solidity ^0.4.24;
pragma experimental "v0.5.0";


library CustomUint8ArrayEncoding {

    /// @dev Decodes a bytes packed into a bytes32
    /// @param encoded - byte 0 is the length `n`, bytes 1 ... n  are the bytes
    /// @return A bytes object with the correct data and elements set
    /// @dev An example:
    ///
    /// We encode [0x11, 0x22, 0x33, 0x44, 0x55] as the following bytes32:
    ///
    ///   0511223344550000000000000000000000000000000000000000000000000000
    ///
    /// To decode, We read the first byte, 0x05, which is the length,
    /// and we allocate a bytes(5).
    /// In memory this is represented in 2 256-bit words, initialized as
    /// follows:
    ///
    ///   0000000000000000000000000000000000000000000000000000000000000005
    ///   0000000000000000000000000000000000000000000000000000000000000000
    ///
    /// The first 32-byte word represents the length, and starting from the
    /// second 32-byte word, the bytes are packed.
    /// We want to place our 32 bytes at offset 31:
    ///
    ///   ..............................................................05
    ///   11223344550000000000000000000000000000000000000000000000000000..
    ///
    /// Like that, the 05 will overwrite the 05 that was already there from
    /// when we allocated the bytes(5), and the data is positioned correctly.
    /// The remaining zeros are ignored.
    function decodeBytes32(bytes32 encoded) internal pure returns (bytes decoded) {
        decoded = new bytes(uint8(encoded[0]));
        assembly {
            mstore(add(decoded, 31), encoded)
        }
    }

}
