// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ForecastMarket {
    string public title;
    string public description;
    address public owner;

    event ForecastCreated(address indexed owner, string title);

    constructor(string memory _title, string memory _description) {
        owner = msg.sender;
        title = _title;
        description = _description;
        emit ForecastCreated(owner, title);
    }

    function updateDescription(string memory _description) external {
        require(msg.sender == owner, "only owner");
        description = _description;
    }
}
