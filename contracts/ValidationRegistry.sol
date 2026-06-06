// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "./interfaces/IERC8004ValidationRegistry.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ValidationRegistry is IERC8004ValidationRegistry {
    address private _identityRegistry;

    struct ValidationStatus {
        address validatorAddress;
        uint256 agentId;
        uint8 response;
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
        bool exists;
        bool hasResponded;
    }

    mapping(bytes32 => ValidationStatus) private _status;
    mapping(uint256 => bytes32[]) private _agentRequests;
    mapping(address => bytes32[]) private _validatorRequests;

    constructor(address identityRegistry_) {
        _initialize(identityRegistry_);
    }

    function initialize(address identityRegistry_) external override {
        require(_identityRegistry == address(0), "Already initialized");
        _initialize(identityRegistry_);
    }

    function _initialize(address identityRegistry_) internal {
        require(identityRegistry_ != address(0), "Invalid registry");
        _identityRegistry = identityRegistry_;
    }

    function getIdentityRegistry() external view override returns (address) {
        return _identityRegistry;
    }

    function validationRequest(address validatorAddress, uint256 agentId, string calldata requestURI, bytes32 requestHash) external override {
        require(!_status[requestHash].exists, "Request already exists");
        address owner = IERC721(_identityRegistry).ownerOf(agentId);
        require(
            msg.sender == owner || 
            IERC721(_identityRegistry).getApproved(agentId) == msg.sender || 
            IERC721(_identityRegistry).isApprovedForAll(owner, msg.sender),
            "Caller not owner/operator"
        );

        _status[requestHash] = ValidationStatus({
            validatorAddress: validatorAddress,
            agentId: agentId,
            response: 0,
            responseHash: bytes32(0),
            tag: "",
            lastUpdate: block.timestamp,
            exists: true,
            hasResponded: false
        });

        _agentRequests[agentId].push(requestHash);
        _validatorRequests[validatorAddress].push(requestHash);

        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }

    function validationResponse(bytes32 requestHash, uint8 response, string calldata responseURI, bytes32 responseHash, string calldata tag) external override {
        require(response <= 100, "Response > 100");
        ValidationStatus storage status = _status[requestHash];
        require(status.exists, "Request does not exist");
        require(msg.sender == status.validatorAddress, "Not authorized validator");

        status.response = response;
        status.responseHash = responseHash;
        status.tag = tag;
        status.lastUpdate = block.timestamp;
        status.hasResponded = true;

        emit ValidationResponse(msg.sender, status.agentId, requestHash, response, responseURI, responseHash, tag);
    }

    function getValidationStatus(bytes32 requestHash) external view override returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string memory tag, uint256 lastUpdate) {
        ValidationStatus storage status = _status[requestHash];
        return (status.validatorAddress, status.agentId, status.response, status.responseHash, status.tag, status.lastUpdate);
    }

    function _matchTag(string memory target, string memory filter) internal pure returns (bool) {
        if (bytes(filter).length == 0) return true;
        return keccak256(bytes(target)) == keccak256(bytes(filter));
    }

    function getSummary(uint256 agentId, address[] calldata validatorAddresses, string calldata tag) external view override returns (uint64 count, uint8 averageResponse) {
        bytes32[] storage reqs = _agentRequests[agentId];
        uint256 totalResponse = 0;

        for (uint256 i = 0; i < reqs.length; i++) {
            ValidationStatus storage status = _status[reqs[i]];
            if (status.hasResponded) {
                bool matchesValidator = validatorAddresses.length == 0;
                for (uint256 j = 0; j < validatorAddresses.length; j++) {
                    if (status.validatorAddress == validatorAddresses[j]) {
                        matchesValidator = true;
                        break;
                    }
                }

                if (matchesValidator && _matchTag(status.tag, tag)) {
                    totalResponse += status.response;
                    count++;
                }
            }
        }

        if (count > 0) {
            averageResponse = uint8(totalResponse / count);
        }
    }

    function getAgentValidations(uint256 agentId) external view override returns (bytes32[] memory) {
        return _agentRequests[agentId];
    }

    function getValidatorRequests(address validatorAddress) external view override returns (bytes32[] memory) {
        return _validatorRequests[validatorAddress];
    }
}
