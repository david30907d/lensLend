const {ethers} =require('hardhat')

const readline =require('readline')
const {transfer} = require("../test/heplers/nativeCoin");
const lensContracts = require("../test/lensContract.json");
const {getVaultAddress} = require("../test/heplers/vault");
const {getProfileId} = require("../test/heplers/lens");
const {generateFeeFollowData, generateFeeFollowInitData} = require("../helpers/follow");
const {checkBalance} = require("../test/heplers/coin");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})


class PrintHelper {
  constructor(users, coin) {
    this.balanceStr = '';
    this.cacheStr = '';
    this.cached = false;
    this.users = users
    this.coin = coin
  }

  printSeparator() {
    console.log('========================================');
  }

  async pause() {
    await new Promise(resolve => rl.question('press enter to continue', resolve));
  }

  async printLoading(value) {
    this.printSameLine(`${value} .`)
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.printSameLine(`${value} ..`)
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.printSameLine(`${value} ...`, this.cached);
    this.printNewLine();
  }

  async updateBalance(printCache = true) {
    await this.refreshBalance();
    this.clearConsole();
    this.printBalance();
    if (printCache) {
      this.printCache();
    }

  }

  resetCache() {
    this.cacheStr = '';
  }

  printCache() {
    process.stdout.write(this.cacheStr);
  }

  printBalance() {
    console.log(this.balanceStr);
  }

  printSameLine(value, cached = false) {
    process.stdout.write(`\r${value}`);
    if (cached) {
      this.cacheStr = this.cacheStr.concat(value);
    }
  }

  printNewLine(value = '') {
    console.log(value);
    if (this.cached) {
      this.cacheStr = this.cacheStr.concat(value + '\n');
    }
  }

  clearConsole() {
    console.clear();
  }

  async refreshBalance() {
    this.balanceStr = await this.getBalance();
  }

  setCached(cached) {
    this.cached = cached;
  }

  async getBalance() {
    let result = '';
    const title = '############################################### balance #########################################';
    result = result.concat(title + '\n');
    const longestName = this.users.map(user => user.userName).reduce((prev, curr) => prev.length > curr.length ? prev : curr);

    for (const user of this.users) {
      const balance = await this.coin.balanceOf(user.address);
      if (user.oriBalance == -1) {
        // user.oriBalance = Number.parseFloat(ethers.utils.formatEther(balance));
        user.oriBalance=balance
      }
      let display = `# ${user.userName} ${' '.repeat(longestName.length - user.userName.length)} original balance: ${ethers.utils.formatUnits(user.oriBalance.toString(),6)} current balance: ${ethers.utils.formatUnits(balance.toString(),6)} usdc`;
      display = display + ' '.repeat(title.length - display.length - 1) + '#';
      result = result.concat(display + '\n');
    }
    result = result.concat('#'.repeat(title.length) + '\n');

    return result;
  }

}


async function connectFixture() {
  const aliceAddr = "0x3D5e9077ef8F9C6B0e10D6c62C1A022a49675Cc3"
  const bobAddr = "0x3A5bd1E37b099aE3386D13947b6a90d97675e5e3"
  const platformAddr = "0x6081258689a75d253d87cE902A8de3887239Fe80"
  const richManAddr = "0x505e71695E9bc45943c58adEC1650577BcA68fD9"
  const coinAddr = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
  const alice = await ethers.getImpersonatedSigner(aliceAddr)
  const bob = await ethers.getImpersonatedSigner(bobAddr)
  const platform = await ethers.getImpersonatedSigner(platformAddr)
  const richMan = await ethers.getImpersonatedSigner(richManAddr)
  const coinContract = await ethers.getContractAt("IERC20", coinAddr)
  const amount = ethers.utils.parseEther("100")
  await transfer(richMan, aliceAddr, amount)
  await transfer(richMan, bobAddr, amount)
  const lenHubContract = await ethers.getContractAt("LensHub", lensContracts.LensHubProxy);
  await lenHubContract.deployed()
  const VaultRegistryContract = await ethers.getContractFactory("VaultRegistry")
  const vaultRegistryContract = await VaultRegistryContract.connect(alice).deploy(platformAddr)
  await vaultRegistryContract.deployed()
  const vaultRecipient = alice.address
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
  const vaultContract = await ethers.getContractAt("Vault", vaultAddr)
  await vaultContract.deployed()
  const aliceProfileId = await lenHubContract.defaultProfile(alice.address)
  const followPrice = "5000000"
  res = await lenHubContract.connect(alice).setFollowModule(
    aliceProfileId,
    lensContracts.FeeFollowModule,
    generateFeeFollowInitData(followPrice, coinContract.address, vaultContract.address),
  );
  await res.wait()
  return {
    alice,bob,platform,
    coinContract,lenHubContract,vaultRegistryContract,vaultContract,
    followPrice
  };
}

async function main() {
  const {
    alice,bob,platform,
    coinContract,lenHubContract,vaultRegistryContract,vaultContract,
    followPrice
  }=await connectFixture()
  const userAlice = {userName: 'alice', address: alice.address, oriBalance: -1};
  const userBob = {userName: 'bob', address: bob.address, oriBalance: -1};
  const userPlatform = {userName: 'platform', address: platform.address, oriBalance: -1};
  const userVault = {userName: 'aliceVault', address: vaultContract.address, oriBalance: -1}
  const users = [userAlice, userBob,userPlatform,userVault ];

  const printHelper = new PrintHelper(users, coinContract);
  printHelper.clearConsole();
  await printHelper.refreshBalance();
  printHelper.printBalance();
  //   ====================== mint profile  ======================
  printHelper.printNewLine(`bob want to follow alice`);


  let res = await coinContract
    .connect(bob).approve(lensContracts.FeeFollowModule, followPrice)
  await res.wait()
  const aliceProfileId =await lenHubContract.defaultProfile(alice.address)
  const followDatas = [generateFeeFollowData(coinContract.address, followPrice)]
  res = await lenHubContract
    .connect(bob).follow([aliceProfileId], followDatas)
  await printHelper.printLoading('following');
  await res.wait()
  await printHelper.pause();
  await printHelper.updateBalance()
  printHelper.printNewLine(`bob has followed alice`);
  printHelper.printNewLine();
  await printHelper.pause();

  printHelper.printNewLine(`alice vault will be liquidated`);
  res=await vaultContract
    .connect(platform).updateRecipient(platform.address)
  await res.wait()
  res=await vaultContract
    .connect(platform).withdraw(coinContract.address,followPrice)
  printHelper.printNewLine(`liquidating`);
  await res.wait()
  await printHelper.pause();
  await printHelper.updateBalance()
  printHelper.printNewLine(`alice vault has liquidated`);
  printHelper.printNewLine();
  await printHelper.pause();
  // let aliceParam = {
  //   to: alice.address,
  //   handle: 'alice',
  //   avatar: 'http://localhost:3000/avatar.png',
  //   metadata: 'http://localhost:3000/metadata.json',
  //   operator: '0x0000000000000000000000000000000000000000',
  // };
  //
  //
  // let receiptPromise = createCCProfile(alice, profileNFT.address, aliceParam).then(async (tx) => tx.wait())
  // await printHelper.printLoading('minting');
  // let receipt = await receiptPromise;
  // if (!receipt.events) {
  //   throw new Error('events is null')
  // }
  // let profileId = getProfileId(<TransferEvent>receipt.events[1]);
  //   const aliceProfile = {...aliceParam, profileId};
  //
  //   printHelper.printNewLine(`profileNFT has been minted, profileId = ${profileId._hex}`);
  //   printHelper.printNewLine();
  //
  //   // ====================== set subscription data ======================
  //
  //   const fee = '1';
  //   const feeEth = ethers.utils.parseEther(fee);
  //   const subscribeMwData = abi.encode(
  //   ['uint256', 'address', 'address', 'bool', 'address'],
  //   [feeEth, alice.address, coin.address, false, '0x0000000000000000000000000000000000000000' ]
  //   );
  //
  //   printHelper.printNewLine(`alice try to set up subscribe data with paid middleware , subscribe fee = ${fee} wbnb and
  //   recipient = ${alice.address}`);
  //   let setPromise = profileNFT.connect(alice).setSubscribeData(aliceProfile.profileId, '', subscribePaidMw.address,
  //   subscribeMwData)
  //   await printHelper.printLoading('setting');
  //   await setPromise;
  //   printHelper.printNewLine(`set successfully`);
  //   printHelper.printNewLine();
  //
  //   // ====================== mint essence ======================
  //
  //   printHelper.printNewLine(`alice try to mint essence nft with paid middleware , collect fee = ${fee} wbnb and
  //   recipient = ${alice.address}`);
  //   const totalSupply = 100000n
  //   const params = {
  //     profileId: aliceProfile.profileId,
  //     name: 'essence1',
  //     symbol: 'E1',
  //     essenceTokenURI: 'http://localhost:3000/essence.json',
  //     essenceMw: collectPaidMw.address,
  //     transferable: false,
  //     deployAtRegister: true,
  //   }
  //   const initData = abi.encode(
  //   ['uint256', 'uint256', 'address', 'address', 'bool'],
  //   [totalSupply, feeEth, alice.address, coin.address, false]
  //   )
  //   const tx = await profileNFT.connect(alice).registerEssence(params, initData);
  //   await printHelper.printLoading('minting');
  //   const {essenceId, essenceNft} = await getEssenceIdFromTx(tx, actions);
  //   printHelper.printNewLine(`essenceNft has been minted, essenceId = ${essenceId} essenceNft = ${essenceNft}`);
  //   await printHelper.pause();
  //   await printHelper.updateBalance()
  //
  //   // ====================== normal subscribe ======================
  //
  //   printHelper.setCached(true);
  //   printHelper.printNewLine(`bob try to subscribe alice`);
  //   const bobSubscribePromise = profileNFT.connect(bob).subscribe({profileIds: [aliceProfile.profileId]} ,[emptyData],
  //   [emptyData]);
  //   await printHelper.printLoading('subscribing');
  //   await bobSubscribePromise ;
  //   await printHelper.updateBalance();
  //   printHelper.printNewLine(`subscribe successfully`);
  //   printHelper.printNewLine();
  //
  //   // ====================== normal collect ======================
  //
  //   printHelper.printNewLine(`bob try to collect essence of alice`);
  //   const collectParam = {
  //     collector: bob.address,
  //     profileId: aliceProfile.profileId,
  //     essenceId: essenceId
  //   }
  //   await printHelper.printLoading('collecting');
  //   const bobCollectPromise = profileNFT.connect(bob).collect(collectParam, emptyData, emptyData)
  //   await bobCollectPromise;
  //   await printHelper.updateBalance();
  //   printHelper.printNewLine(`collect successfully`);
  //   printHelper.resetCache();
  //   await printHelper.pause();
  //   await printHelper.updateBalance();
  //
  //   // ====================== redirect fee ======================
  //
  //   printHelper.printNewLine(`alice borrow 5 wbnb from carl through sprout`);
  //   const borrowPromise = coin.connect(carl).transfer(alice.address, ethers.utils.parseEther('5'));
  //   await printHelper.printLoading('borrowing');
  //   await borrowPromise;
  //   printHelper.printNewLine(`borrow successfully`);
  //   printHelper.printNewLine();
  //   await printHelper.updateBalance();
  //
  //   printHelper.printNewLine(`carl activate bond, redirect subscribe fee to sprout treasury `);
  //   const subscribeFeeRedirectPromise = subscribePaidMw.setFeeRedirect(aliceProfile.profileId, true);
  //   const collectFeeRedirectPromise = collectPaidMw.setFeeRedirect(aliceProfile.profileId, true)
  //   await printHelper.printLoading('setting');
  //   await subscribeFeeRedirectPromise;
  //   await collectFeeRedirectPromise;
  //   printHelper.printNewLine(`set successfully`);
  //   printHelper.printNewLine();
  //
  //   // ====================== redirect subscribe ======================
  //
  //   printHelper.printNewLine(`debby try to subscribe alice`);
  //   const debbySubscribePromise =
  //   profileNFT.connect(debby).subscribe({profileIds: [aliceProfile.profileId]} ,[emptyData], [emptyData]);
  //   await printHelper.printLoading('subscribing');
  //   const debbySubscribeTransaction = await debbySubscribePromise;
  //   await printHelper.updateBalance();
  //   printHelper.printNewLine(`subscribe successfully`);
  //   printHelper.printNewLine();
  //
  //   // ====================== redirect collect ======================
  //
  //   printHelper.printNewLine(`debby try to collect essence of alice`);
  //   const collectParam2 = {
  //     collector: debby.address,
  //     profileId: aliceProfile.profileId,
  //     essenceId: essenceId
  //   }
  //   const debbyCollectPromise = profileNFT.connect(debby).collect(collectParam2, emptyData, emptyData)
  //   const debbyCollectTransaction = await debbyCollectPromise;
  //   await printHelper.printLoading('collecting');
  //   await printHelper.updateBalance();
  //   printHelper.printNewLine(`collect successfully`);
  //   printHelper.printNewLine();
  //   await printHelper.pause();
  //   printHelper.resetCache();
  //   printHelper.clearConsole();
  //   printHelper.printBalance();
  //
  //   // ====================== deposit from sprout treasury ======================
  //
  //   const subscribeFee = await getSubscribePaidAmountFromTx(debbySubscribeTransaction, subscribePaidMw,
  //   sproutTreasury.address, profileId);
  //   const collectFee = await getCollectPaidAmountFromTx(debbyCollectTransaction, collectPaidMw, sproutTreasury.address,
  //   profileId, essenceId);
  //   const depositAmount = subscribeFee.add(collectFee);
  //   const nonce = (new Date()).getTime()
  //
  //   const withdrawHash = generateWithdrawHash(carl.address, coin.address, depositAmount, nonce);
  //   const depositProof = await owner.signMessage(withdrawHash);
  //   printHelper.printNewLine(`carl try to withdraw from sprout treasury`);
  //   const withdrawPromise = sproutTreasury.connect(carl).whitelistWithdraw(coin.address, depositAmount, nonce,
  //   depositProof);
  //   await printHelper.printLoading('withdrawing');
  //   await withdrawPromise ;
  //   await printHelper.updateBalance();
  //   printHelper.printNewLine(`withdraw successfully`);
  //   await printHelper.pause();
}

main()
  .then(() => console.log(`exec successfully`))
  .catch((err) => {
    console.log(`exec fail,err: ${err}`)
    process.exitCode = 1
  }).finally(() => process.exit())
