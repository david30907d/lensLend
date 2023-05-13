const {ethers} = require("hardhat");
const { expect } = require("chai");
async function airdropCoin(coinAddress,to,amount){
  const coin = await ethers.getContractAt(
    "MockCoin",coinAddress
  );
  const res= await coin.mintTo(to,amount)
  await res.wait()
}

async function checkBalance(coinAddress,owner,amount){
  const coin = await ethers.getContractAt(
    "MockCoin",coinAddress
  );
  const balance= await coin.balanceOf(owner)
  expect(balance.eq(amount)).to.true
}

module.exports =  {
  airdropCoin,
  checkBalance
}
