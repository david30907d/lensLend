// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AuthorizedMapping {
    address private owner;
    mapping(address => uint256) private authorizedMap;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function getValue(address _addr) public view returns (uint256) {
        return authorizedMap[_addr];
    }

    function addAuthorized(address _addr, uint256 _value) public onlyOwner {
        authorizedMap[_addr] = _value;
    }

    function updateAuthorized(address _addr, uint256 _value) public onlyOwner {
        authorizedMap[_addr] = _value;
    }

    function removeAuthorized(address _addr) public onlyOwner {
        delete authorizedMap[_addr];
    }
}
