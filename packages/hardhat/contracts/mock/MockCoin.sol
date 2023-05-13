// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockCoin is ERC20 {
    constructor() ERC20('MOCKCOIN', 'MC') {}

    function mint(uint256 _amount) external {
        _mint(msg.sender, _amount);
    }

    function mintTo(address _receiver, uint256 _amount) external {
        _mint(_receiver, _amount);
    }
}
