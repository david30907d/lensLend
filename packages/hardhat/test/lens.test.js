const {ethers} = require("hardhat");
const {getVaultAddress} = require("./heplers/vault");
const {expect} = require("chai");
const {airdropCoin, checkBalance} = require("./heplers/coin");

const lensContracts = require('./lensContract.json')
const {transfer} = require("./heplers/nativeCoin");
const {generateFollowData, generateFollowInitData, generateProfileFollowInitData, generateProfileFollowData,
  generateFeeFollowInitData, generateFeeFollowData
} = require("../helpers/follow");
const {getProfileId, checkProfileFollow, checkCurrencyWhitelist, checkFeeFollow} = require("./heplers/lens");
describe("Lens", function () {
  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  it("Should deployed", async function () {
    const lenHubContract = await ethers.getContractAt("LensHub",lensContracts.LensHubProxy);
    await lenHubContract.deployed()
  });
  describe("LenHub Function Test", function () {
    let lenHubContract;
    let user1, user2;
    let profileId1,profileId2

    beforeEach(async () => {
      const user1Addr="0x3D5e9077ef8F9C6B0e10D6c62C1A022a49675Cc3"
      const user2Addr="0x3A5bd1E37b099aE3386D13947b6a90d97675e5e3"
      const richManAddr="0x505e71695E9bc45943c58adEC1650577BcA68fD9"
      user1=await ethers.getImpersonatedSigner(user1Addr)
      user2=await ethers.getImpersonatedSigner(user2Addr)
      const richMan=await ethers.getImpersonatedSigner(richManAddr)
      const amount=ethers.utils.parseEther("100")
      await transfer(richMan,user1Addr,amount)
      await transfer(richMan,user2Addr,amount)
      await transfer(richMan,"0xf94b90bbeee30996019babd12cecddccf68331de",amount)
      lenHubContract = await ethers.getContractAt("LensHub",lensContracts.LensHubProxy);
      await lenHubContract.deployed()
      profileId1= await getProfileId(user1.address)
      profileId2= await getProfileId(user2.address)
    })
    it("getProfile", async function () {
      const profile= await lenHubContract.getProfile(profileId1)
      console.log(profile)
      const followURI= await lenHubContract.getFollowNFTURI(profileId1)
      console.log(followURI)
    });
    describe("free follow",()=>{
      beforeEach( async ()=>{
        const res = await lenHubContract.connect(user1).setFollowModule(
          profileId1,
          lensContracts.ProfileFollowModule,
          generateProfileFollowInitData(),
        );
        await res.wait()
        const profile= await lenHubContract.getProfile(profileId1)
        expect(
          profile.followModule.toLowerCase()
          ==lensContracts.ProfileFollowModule.toLowerCase()).to.true
      })
      it("free follow", async function () {
        const profileIds=[profileId1]
        console.log(profileId2)
        const followDatas=[generateProfileFollowData(profileId2)]
        await checkProfileFollow(profileId1,profileId2,false)
        const res= await lenHubContract
          .connect(user2).follow(profileIds,followDatas)
        await res.wait()
        await checkProfileFollow(profileId2,profileId1,true)
      });
    })

    describe("fee follow",()=>{
      let price=100
      let coinContract
      let recipient
      beforeEach( async ()=>{
        coinContract = await ethers.getContractAt("IERC20","0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174")
        await coinContract.deployed()
        await checkCurrencyWhitelist(coinContract.address,true)
        recipient=user1.address
        const abi = ethers.utils.defaultAbiCoder
        console.log(lensContracts.FeeFollowModule)
        const res = await lenHubContract.connect(user1).setFollowModule(
          profileId1,
          lensContracts.FeeFollowModule,
          generateFeeFollowInitData(price,coinContract.address,recipient),
        );
        await res.wait()
        const profile= await lenHubContract.getProfile(profileId1)
        expect(
          profile.followModule.toLowerCase()
          ==lensContracts.FeeFollowModule.toLowerCase()).to.true
        await checkFeeFollow(
          profileId1,price,coinContract.address,recipient)
      })
      it("fee follow", async function () {
        const profileIds=[profileId1]
        let res= await coinContract
          .connect(user2).approve(lensContracts.FeeFollowModule,price)
        await res.wait()
        console.log(profileId2)
        const followDatas=[generateFeeFollowData(coinContract.address,price)]
        // await checkProfileFollow(profileId1,profileId2,false)
        res= await lenHubContract
          .connect(user2).follow(profileIds,followDatas)
        await res.wait()
        // await checkProfileFollow(profileId2,profileId1,true)
      });
    })
  });
});
