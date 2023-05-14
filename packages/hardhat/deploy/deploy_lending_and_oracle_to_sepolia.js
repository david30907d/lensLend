const hre = require("hardhat");

async function main() {
  const oracle = await hre.ethers.getContractFactory("AuthorizedMapping");
  const oracleContract = await oracle.deploy();
  await oracleContract.deployed();
  console.log('Deployed oracleContract Address:', oracleContract.address);
  const lending = await hre.ethers.getContractFactory("Lending");
  const lendingContract = await lending.deploy("0x2c74b18e2f84b78ac67428d0c7a9898515f0c46f", "0xE3Dd183ffa70BcFC442A0B9991E682cA8A442Ade", oracleContract.address);
  await lendingContract.deployed();
  console.log('Deployed lendingContract Address:', lendingContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })