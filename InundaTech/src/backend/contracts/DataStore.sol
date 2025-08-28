// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DataStore {
    event DataStored(address indexed sender, string ipfsHash, uint256 timestamp, string meta);

    struct Item { string ipfsHash; string meta; uint256 timestamp; }
    mapping(uint256 => Item) public items;
    uint256 public count;

    function store(string calldata ipfsHash, string calldata meta) external {
        items[count] = Item(ipfsHash, meta, block.timestamp);
        emit DataStored(msg.sender, ipfsHash, block.timestamp, meta);
        count++;
    }
}
