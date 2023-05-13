const {ethers} = require("hardhat");
const { expect } = require("chai");

async function getVaultAddress(registryAddr,recipient,salt){
  const registryContract=await ethers.getContractAt("VaultRegistry",registryAddr)
  const vaultAddr=await registryContract
    .callStatic.createVault(recipient,salt);
  return vaultAddr
}

module.exports ={
  getVaultAddress
}
