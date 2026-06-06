// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "./interfaces/IERC8004IdentityRegistry.sol";

contract IdentityRegistry is ERC721URIStorage, EIP712, IERC8004IdentityRegistry {
    uint256 private _nextTokenId;

    // metadataKey => metadataValue
    mapping(uint256 => mapping(string => bytes)) private _metadata;
    mapping(uint256 => address) private _agentWallets;

    bytes32 private constant SET_AGENT_WALLET_TYPEHASH = keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)");

    constructor() ERC721("ERC8004 Identity Registry", "AGNT") EIP712("ERC8004IdentityRegistry", "1") {
        _nextTokenId = 1;
    }

    modifier onlyAgentOwnerOrApproved(uint256 agentId) {
        _requireOwned(agentId);
        require(_isAuthorized(ownerOf(agentId), msg.sender, agentId), "IdentityRegistry: caller is not owner nor approved");
        _;
    }

    function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory) {
        require(keccak256(bytes(metadataKey)) != keccak256(bytes("agentWallet")), "IdentityRegistry: reserved key");
        return _metadata[agentId][metadataKey];
    }

    function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external onlyAgentOwnerOrApproved(agentId) {
        require(keccak256(bytes(metadataKey)) != keccak256(bytes("agentWallet")), "IdentityRegistry: reserved key");
        _metadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return _agentWallets[agentId];
    }

    function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external onlyAgentOwnerOrApproved(agentId) {
        require(block.timestamp <= deadline, "IdentityRegistry: signature expired");

        bytes32 structHash = keccak256(abi.encode(SET_AGENT_WALLET_TYPEHASH, agentId, newWallet, deadline));
        bytes32 hash = _hashTypedDataV4(structHash);

        require(SignatureChecker.isValidSignatureNow(newWallet, hash, signature), "IdentityRegistry: invalid signature");

        _agentWallets[agentId] = newWallet;
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(newWallet));
    }

    function unsetAgentWallet(uint256 agentId) external onlyAgentOwnerOrApproved(agentId) {
        delete _agentWallets[agentId];
        emit MetadataSet(agentId, "agentWallet", "agentWallet", "");
    }

    function register(string calldata agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId) {
        agentId = _nextTokenId++;
        _mint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);

        _agentWallets[agentId] = msg.sender;
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(msg.sender));

        for (uint256 i = 0; i < metadata.length; i++) {
            require(keccak256(bytes(metadata[i].metadataKey)) != keccak256(bytes("agentWallet")), "IdentityRegistry: reserved key");
            _metadata[agentId][metadata[i].metadataKey] = metadata[i].metadataValue;
            emit MetadataSet(agentId, metadata[i].metadataKey, metadata[i].metadataKey, metadata[i].metadataValue);
        }

        emit Registered(agentId, agentURI, msg.sender);
    }

    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _nextTokenId++;
        _mint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        
        _agentWallets[agentId] = msg.sender;
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(msg.sender));
        
        emit Registered(agentId, agentURI, msg.sender);
    }

    function register() external returns (uint256 agentId) {
        agentId = _nextTokenId++;
        _mint(msg.sender, agentId);
        
        _agentWallets[agentId] = msg.sender;
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(msg.sender));
        
        emit Registered(agentId, "", msg.sender);
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external onlyAgentOwnerOrApproved(agentId) {
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0) && from != to) {
            delete _agentWallets[tokenId];
            emit MetadataSet(tokenId, "agentWallet", "agentWallet", "");
        }
        return from;
    }
}
