// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

struct MetadataEntry {
    string metadataKey;
    bytes metadataValue;
}

interface IERC8004IdentityRegistry {
    event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue);
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);

    function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory);
    function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external;
    function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external;
    function getAgentWallet(uint256 agentId) external view returns (address);
    function unsetAgentWallet(uint256 agentId) external;

    function register(string calldata agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId);
    function register(string calldata agentURI) external returns (uint256 agentId);
    function register() external returns (uint256 agentId);

    function setAgentURI(uint256 agentId, string calldata newURI) external;
}
