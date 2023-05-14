const {ethers} = require("hardhat");
const { expect } = require("chai");

async function getVaultAddress(registryAddr,caller,recipient,salt){
  const registryContract=await ethers.getContractAt("VaultRegistry",registryAddr)
  const vaultAddr=await registryContract.connect(caller)
    .callStatic.createVault(recipient,salt,
  {value:ethers.utils.parseEther("4")});
  return vaultAddr
}

module.exports ={
  getVaultAddress
}
