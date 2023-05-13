const {ethers} = require("hardhat");
const {expect} = require("chai");
const {checkBalance, airdropCoin} = require("./heplers/coin");
const {getVaultAddress} = require("./heplers/vault");

describe("Vault", function () {
  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  it("Should deploy Vault Registry Contract", async function () {
    const VaultRegistryContract = await ethers.getContractFactory("VaultRegistry");
    const [deployer] = await ethers.getSigners()
    const adminAddress = deployer.address
    const vaultRegistryContract = await VaultRegistryContract.deploy(
      adminAddress
    );
    await vaultRegistryContract.deployed()
  });
  describe("Vault Registry Function Test", function () {
    let vaultRegistryContract;
    let deployer, user2;
    beforeEach(async () => {
      [deployer,user2] = await ethers.getSigners()
      const VaultRegistryContract = await ethers.getContractFactory("VaultRegistry");
      const adminAddress = deployer.address
      vaultRegistryContract = await VaultRegistryContract.deploy(
        adminAddress
      );
      await vaultRegistryContract.deployed()
    })
    describe("CreateVault Test", () => {
      it("Create Vault successfully", async function () {
        const recipient = deployer.address
        const salt = ethers.utils.formatBytes32String("dwedewdewdew");
        const vaultAddr = await getVaultAddress(
          vaultRegistryContract.address, recipient, salt
        )
        console.log(vaultAddr)
        await expect(vaultRegistryContract.createVault(recipient, salt))
          .to.emit(vaultRegistryContract, 'VaultCreated')
          .withArgs(vaultAddr, recipient)
      });
    })

  });


  describe("Vault Function Test", function () {
    let vaultContract;
    let coinContract;
    let deployer, user2;
    beforeEach(async () => {
      [deployer, user2] = await ethers.getSigners()
      const RegistryContract = await ethers.getContractFactory("VaultRegistry");
      const adminAddress = deployer.address
      const registryContract = await RegistryContract.deploy(
        adminAddress
      );
      await registryContract.deployed()
      const CoinContract = await ethers.getContractFactory("MockCoin");
      coinContract = await CoinContract.deploy();
      await coinContract.deployed()
      const recipient = deployer.address
      const salt = ethers.utils.formatBytes32String("dwedewdewdew");
      const vaultAddr = await getVaultAddress(
        registryContract.address, recipient, salt
      )
      vaultContract=await ethers.getContractAt("Vault",vaultAddr)
    })
    describe("Withdraw Test", () => {
      it("Withdraw With Right Sender", async function () {
        const coinAddress = coinContract.address
        const withdrawAmount = "10000"
        await airdropCoin(coinAddress, vaultContract.address, withdrawAmount)
        const res = await vaultContract.withdraw(coinAddress, withdrawAmount);
        await res.wait()
        await checkBalance(coinAddress, deployer.address, withdrawAmount)
      });
      // it("Withdraw With Wrong Sender", async function () {
      //   const coinAddress = coinContract.address
      //   const vaultWithUser2 = vaultContract.connect(user2)
      //   await expect(vaultWithUser2.withdraw(coinAddress, "10000"))
      //     .to.revertedWith(
      //       'invalid recipient'
      //     )
      // });
    })

  });
});
