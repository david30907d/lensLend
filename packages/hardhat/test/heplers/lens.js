const {ethers} = require("hardhat");
const lensContracts = require("../lensContract.json");
const { expect } = require("chai");
async function getProfileId(owner){
  const lenHubContract = await ethers.getContractAt("LensHub",lensContracts.LensHubProxy);
  await lenHubContract.deployed()
  const profileId =await lenHubContract.defaultProfile(owner)
  return profileId
}

async function checkCurrencyWhitelist(coin,allow){
  const module=await ethers.getContractAt("ModuleGlobals",lensContracts.ModuleGlobals)
  const res=await module.isCurrencyWhitelisted(coin)
  expect(res===allow).to.true
}

async function checkProfileFollow(follower,to,following){
  const profileFollow = await ethers.getContractAt(
    "ProfileFollowModule",lensContracts.ProfileFollowModule
  );
  await profileFollow.deployed()
  const res =await profileFollow.isProfileFollowing(follower,to)
  console.log(res)
  expect(res===following).to.true;
}

async function checkFeeFollow(profileId,price,coin,recipient){
  const feeFollow = await ethers.getContractAt(
    "FeeFollowModule",lensContracts.FeeFollowModule
  );
  await feeFollow.deployed()
  const profile =await feeFollow.getProfileData(profileId)
  // expect(profile.amount===price).to.true;
  expect(profile.currency.toLowerCase()===coin.toLowerCase()).to.true;
  expect(profile.recipient.toLowerCase()===recipient.toLowerCase()).to.true;
}

module.exports = {
  getProfileId,
  checkProfileFollow,
  checkCurrencyWhitelist,
  checkFeeFollow
}
