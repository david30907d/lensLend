// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Vault.sol";

contract VaultRegistry {

    address public vaultAdmin;

    event VaultCreated(address indexed vaultAddress, address recipent);

    constructor(address _vaultAdmin){
        vaultAdmin=_vaultAdmin;
    }

    function createVault(
        address _recipient,
        bytes32 _salt
    ) external payable returns (address){
        require(msg.value >= 0,"value not enough");
        Vault vault= new Vault{salt: _salt}(_recipient,vaultAdmin);
        emit VaultCreated(address(vault),_recipient);
        return address(vault);
    }
}
