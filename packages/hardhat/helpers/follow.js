const {ethers} = require("hardhat");

const abi = ethers.utils.defaultAbiCoder


function generateProfileFollowInitData(){
  return "0x"
}
function generateProfileFollowData(followerProfileId){
  const data=abi.encode(
    ["uint256"],[followerProfileId]
  )
  return data
}

function generateFeeFollowInitData(price,currency,recipient){
  const data = abi.encode(
    ['uint256', 'address', 'address'],
    [price, currency, recipient]
  );
  return data
}
function generateFeeFollowData(currency,price){
  const data = abi.encode(
    ['address', 'uint256'],
    [currency, price]
  );
  return data
}

module.exports ={
  generateProfileFollowData,
  generateProfileFollowInitData,
  generateFeeFollowData,
  generateFeeFollowInitData
}
