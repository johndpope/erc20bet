pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "./Rng.sol";
import "./usingOraclize.sol";


contract OraclizeRng is Rng, usingOraclize {

    constructor() public {
        // see https://github.com/oraclize/ethereum-examples/blob/master/solidity/random-datasource/randomExample.sol
        OAR = OraclizeAddrResolverI(0x06fe18caA64CE3C25e0b94085AfB0383AcE7Cc18);
        // oraclize_setProof(proofType_Ledger);
    }

    function sendRngRequest() internal returns (bytes32 uniqueRngRequestId) {
        // https://github.com/oraclize/ethereum-examples/blob/master/solidity/random-datasource/randomExample.sol
        // ToDo: Check [oraclize_randomDS_setCommitment](https://docs.oraclize.it/#two-party-interactions)
        // E.g. Oraclize recommends smart contract developers to verify if the queryId sends by the callback transaction
        // was generated by a valid call to the oracize_query function, as shown in the example accompanying this paragraph.
        // This ensures that each query response is processed only once and helps avoid misuse of the smart contract logic.
        return oraclize_newRandomDSQuery({
            _delay: 0,
            _nbytes: 4,
            _customGasLimit: 200000
        });
    }

    // solium-disable-next-line mixedcase
    function __callback(bytes32 _queryId, string _result, bytes _proof) public {
        require(msg.sender == oraclize_cbAddress());
        if (oraclize_randomDS_proofVerify__returnCode(_queryId, _result, _proof) == 0) {
            onRngResponseResult(_queryId, uint256(uint32(keccak256(abi.encodePacked(_result)))));  // uint32(bytes32) takes lower 4 bytes
        } else {
            onRngResponseError(_queryId);
        }
    }

}
