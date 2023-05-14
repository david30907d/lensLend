const {ethers} = require("hardhat");
const {expect} = require("chai");
const {checkBalance, airdropCoin} = require("./heplers/coin");
const {getVaultAddress} = require("./heplers/vault");
const {transfer} = require("./heplers/nativeCoin");
const lensContracts = require("./lensContract.json");
const {getProfileId, checkFeeFollow} = require("./heplers/lens");
const {generateFeeFollowInitData, generateFeeFollowData} = require("../helpers/follow");

describe("Integrate", function () {

  let alice, bob, admin
  let vaultRegistryContract
  let coinContract
  let lenHubContract
  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before(async () => {
    const aliceAddr = "0x3D5e9077ef8F9C6B0e10D6c62C1A022a49675Cc3"
    const bobAddr = "0x3A5bd1E37b099aE3386D13947b6a90d97675e5e3"
    const adminAddr = "0x6081258689a75d253d87cE902A8de3887239Fe80"
    const richManAddr = "0x505e71695E9bc45943c58adEC1650577BcA68fD9"
    const coinAddr = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
    alice = await ethers.getImpersonatedSigner(aliceAddr)
    bob = await ethers.getImpersonatedSigner(bobAddr)
    admin = await ethers.getImpersonatedSigner(adminAddr)
    const richMan = await ethers.getImpersonatedSigner(richManAddr)
    coinContract = await ethers.getContractAt("IERC20", coinAddr)
    const amount = ethers.utils.parseEther("100")
    await transfer(richMan, aliceAddr, amount)
    await transfer(richMan, bobAddr, amount)
    lenHubContract = await ethers.getContractAt("LensHub", lensContracts.LensHubProxy);
    await lenHubContract.deployed()
    const VaultRegistryContract = await ethers.getContractFactory("VaultRegistry")
    vaultRegistryContract = await VaultRegistryContract.connect(alice).deploy(adminAddr)
    await vaultRegistryContract.deployed()
  });
  describe("test", () => {
    let vaultRecipient
    let vaultContract
    let followPrice
    beforeEach(async () => {
      await vaultRegistryContract.deployed()
      vaultRecipient = alice.address
      console.log(vaultRecipient)
      const salt = ethers.utils.formatBytes32String(`fuckerWooooo${Math.random()}`);
      const vaultAddr = await getVaultAddress(
        vaultRegistryContract.address, alice, vaultRecipient, salt
      )
      let res = await vaultRegistryContract
        .connect(bob).createVault(
          vaultRecipient, salt,
          {value: ethers.utils.parseEther("10")}
        )
      await res.wait()
      vaultContract = await ethers.getContractAt("Vault", vaultAddr)
      await vaultContract.deployed()
      const aliceProfileId = await getProfileId(alice.address)
      followPrice = "100"
      res = await lenHubContract.connect(alice).setFollowModule(
        aliceProfileId,
        lensContracts.FeeFollowModule,
        generateFeeFollowInitData(followPrice, coinContract.address, vaultContract.address),
      );
      await res.wait()
      const aliceProfile = await lenHubContract.getProfile(aliceProfileId)
      expect(
        aliceProfile.followModule.toLowerCase()
        === lensContracts.FeeFollowModule.toLowerCase()).to.true
      await checkFeeFollow(
        aliceProfileId, followPrice, coinContract.address, vaultContract.address)
      res = await coinContract
        .connect(bob).approve(lensContracts.FeeFollowModule, followPrice)
      await res.wait()
      const bobProfileId = await getProfileId(bob.address)
      console.log(bobProfileId)
      const followDatas = [generateFeeFollowData(coinContract.address, followPrice)]
      res = await lenHubContract
        .connect(bob).follow([aliceProfileId], followDatas)
      await res.wait()
    })
    it("without liquidate", async function () {
      let aliceBalance = await coinContract.balanceOf(alice.address)
      const res = await vaultContract
        .connect(alice).withdraw(coinContract.address, followPrice)
      await res.wait()
      await checkBalance(coinContract.address, alice.address, aliceBalance.add(followPrice))
    });
    it("with liquidate", async function () {
      let res=await vaultContract
        .connect(admin).updateRecipient(admin.address)
      await res.wait()
      let adminBalance=await coinContract.balanceOf(admin.address)
      res=await vaultContract
        .connect(admin).withdraw(coinContract.address,followPrice)
      await res.wait()
      await checkBalance(coinContract.address, admin.address, adminBalance.add(followPrice))
    });
  })
});
