// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/interfaces/IERC20.sol';


contract Vault {
    address public recipient;
    address public admin;

    constructor(address _recipient,address _admin) {
        recipient = _recipient;
        admin = _admin;
    }



//    function init(address _recipient,address _admin) external {
//        recipient = _recipient;
//        admin = _admin;
//    }

    modifier onlyRecipient(){
        require(msg.sender == recipient, "invalid recipient");
        _;
    }
    modifier onlyAdmin(){
        require(msg.sender == admin, "invalid admin");
        _;
    }

    function withdraw(
        address _coin, uint256 _amount
    ) external onlyRecipient returns (bool){
        IERC20 coin = IERC20(_coin);
        uint balance=coin.balanceOf(address(this));
        require(
            balance>=_amount,"insufficient balance"
        );
        require(
            coin.transfer(recipient, _amount), "coin transfer fail"
        );
        return true;
    }

    function updateRecipient(address _newRecipient) external returns (bool){
        recipient=_newRecipient;
        return true;
    }
}
