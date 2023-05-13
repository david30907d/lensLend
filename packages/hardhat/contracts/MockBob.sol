// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";


contract MockBob is ERC20{
    constructor() ERC20("Bob","Bob") {
        _mint(msg.sender, 1000 * 10 ** 18);
    }
    function showMsgSender() external view returns (string memory) {
        console.log("msg.sender in showMsgSender: ", msg.sender);
        return "test";
    }
}