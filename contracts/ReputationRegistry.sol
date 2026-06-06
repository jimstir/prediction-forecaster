// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "./interfaces/IERC8004ReputationRegistry.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ReputationRegistry is IERC8004ReputationRegistry {
    address private _identityRegistry;

    struct Feedback {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        bool isRevoked;
    }

    mapping(uint256 => mapping(address => Feedback[])) private _feedbacks;
    mapping(uint256 => address[]) private _clients;
    mapping(uint256 => mapping(address => bool)) private _hasClient;
    mapping(uint256 => mapping(address => mapping(uint64 => address[]))) private _responders;

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

    function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external override {
        require(valueDecimals <= 18, "Decimals must be <= 18");
        
        address owner = IERC721(_identityRegistry).ownerOf(agentId);
        require(msg.sender != owner, "Owner cannot give feedback");
        require(IERC721(_identityRegistry).getApproved(agentId) != msg.sender, "Approved cannot give feedback");
        require(!IERC721(_identityRegistry).isApprovedForAll(owner, msg.sender), "Operator cannot give feedback");

        uint64 feedbackIndex = uint64(_feedbacks[agentId][msg.sender].length + 1);
        _feedbacks[agentId][msg.sender].push(Feedback({
            value: value,
            valueDecimals: valueDecimals,
            tag1: tag1,
            tag2: tag2,
            isRevoked: false
        }));

        if (!_hasClient[agentId][msg.sender]) {
            _hasClient[agentId][msg.sender] = true;
            _clients[agentId].push(msg.sender);
        }

        emit NewFeedback(agentId, msg.sender, feedbackIndex, value, valueDecimals, tag1, tag1, tag2, endpoint, feedbackURI, feedbackHash);
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external override {
        require(feedbackIndex > 0 && feedbackIndex <= _feedbacks[agentId][msg.sender].length, "Invalid index");
        Feedback storage fb = _feedbacks[agentId][msg.sender][feedbackIndex - 1];
        require(!fb.isRevoked, "Already revoked");
        fb.isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string calldata responseURI, bytes32 responseHash) external override {
        require(feedbackIndex > 0 && feedbackIndex <= _feedbacks[agentId][clientAddress].length, "Invalid index");
        _responders[agentId][clientAddress][feedbackIndex].push(msg.sender);
        emit ResponseAppended(agentId, clientAddress, feedbackIndex, msg.sender, responseURI, responseHash);
    }

    function _matchTag(string memory target, string memory filter) internal pure returns (bool) {
        if (bytes(filter).length == 0) return true;
        return keccak256(bytes(target)) == keccak256(bytes(filter));
    }

    function getSummary(uint256 agentId, address[] calldata clientAddresses, string calldata tag1, string calldata tag2) external view override returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals) {
        require(clientAddresses.length > 0, "Clients required");
        int256 totalValue = 0;
        uint64 validCount = 0;
        uint8 maxDecimals = 0;

        for (uint256 i = 0; i < clientAddresses.length; i++) {
            address client = clientAddresses[i];
            Feedback[] storage fbs = _feedbacks[agentId][client];
            for (uint256 j = 0; j < fbs.length; j++) {
                if (!fbs[j].isRevoked && _matchTag(fbs[j].tag1, tag1) && _matchTag(fbs[j].tag2, tag2)) {
                    if (fbs[j].valueDecimals > maxDecimals) {
                        maxDecimals = fbs[j].valueDecimals;
                    }
                }
            }
        }

        for (uint256 i = 0; i < clientAddresses.length; i++) {
            address client = clientAddresses[i];
            Feedback[] storage fbs = _feedbacks[agentId][client];
            for (uint256 j = 0; j < fbs.length; j++) {
                if (!fbs[j].isRevoked && _matchTag(fbs[j].tag1, tag1) && _matchTag(fbs[j].tag2, tag2)) {
                    int256 scaledValue = int256(fbs[j].value) * int256(10 ** (maxDecimals - fbs[j].valueDecimals));
                    totalValue += scaledValue;
                    validCount++;
                }
            }
        }

        if (validCount > 0) {
            summaryValue = int128(totalValue / int256(uint256(validCount)));
        }
        
        return (validCount, summaryValue, maxDecimals);
    }

    function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) external view override returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked) {
        require(feedbackIndex > 0 && feedbackIndex <= _feedbacks[agentId][clientAddress].length, "Invalid index");
        Feedback storage fb = _feedbacks[agentId][clientAddress][feedbackIndex - 1];
        return (fb.value, fb.valueDecimals, fb.tag1, fb.tag2, fb.isRevoked);
    }

    function readAllFeedback(uint256 agentId, address[] calldata clientAddresses, string calldata tag1, string calldata tag2, bool includeRevoked) external view override returns (address[] memory clients, uint64[] memory feedbackIndexes, int128[] memory values, uint8[] memory valueDecimals, string[] memory tag1s, string[] memory tag2s, bool[] memory revokedStatuses) {
        uint256 totalMatches = 0;
        
        for (uint256 i = 0; i < clientAddresses.length; i++) {
            address client = clientAddresses[i];
            Feedback[] storage fbs = _feedbacks[agentId][client];
            for (uint256 j = 0; j < fbs.length; j++) {
                if ((includeRevoked || !fbs[j].isRevoked) && _matchTag(fbs[j].tag1, tag1) && _matchTag(fbs[j].tag2, tag2)) {
                    totalMatches++;
                }
            }
        }

        clients = new address[](totalMatches);
        feedbackIndexes = new uint64[](totalMatches);
        values = new int128[](totalMatches);
        valueDecimals = new uint8[](totalMatches);
        tag1s = new string[](totalMatches);
        tag2s = new string[](totalMatches);
        revokedStatuses = new bool[](totalMatches);

        uint256 idx = 0;
        for (uint256 i = 0; i < clientAddresses.length; i++) {
            address client = clientAddresses[i];
            Feedback[] storage fbs = _feedbacks[agentId][client];
            for (uint256 j = 0; j < fbs.length; j++) {
                if ((includeRevoked || !fbs[j].isRevoked) && _matchTag(fbs[j].tag1, tag1) && _matchTag(fbs[j].tag2, tag2)) {
                    clients[idx] = client;
                    feedbackIndexes[idx] = uint64(j + 1);
                    values[idx] = fbs[j].value;
                    valueDecimals[idx] = fbs[j].valueDecimals;
                    tag1s[idx] = fbs[j].tag1;
                    tag2s[idx] = fbs[j].tag2;
                    revokedStatuses[idx] = fbs[j].isRevoked;
                    idx++;
                }
            }
        }
    }

    function getResponseCount(uint256 agentId, address clientAddress, uint64 feedbackIndex, address[] calldata responders) external view override returns (uint64 count) {
        address[] storage resps = _responders[agentId][clientAddress][feedbackIndex];
        if (responders.length == 0) {
            return uint64(resps.length);
        }
        for (uint256 i = 0; i < resps.length; i++) {
            for (uint256 j = 0; j < responders.length; j++) {
                if (resps[i] == responders[j]) {
                    count++;
                    break;
                }
            }
        }
    }

    function getClients(uint256 agentId) external view override returns (address[] memory) {
        return _clients[agentId];
    }

    function getLastIndex(uint256 agentId, address clientAddress) external view override returns (uint64) {
        return uint64(_feedbacks[agentId][clientAddress].length);
    }
}
