const { ethers } = require("hardhat");
const { expect } = require("chai");
const zkBobDirectDepositAddress = "0xE3Dd183ffa70BcFC442A0B9991E682cA8A442Ade"
const bobTokenAddress = "0x2c74b18e2f84b78ac67428d0c7a9898515f0c46f"
const bobABI = require("../contracts/bobABI.json")
const myZkAddress = "zkbob_sepolia:NABCv7GwqfGxGn71gnpsb5tjLC6CuxJdKTBjsVQN5Ahxyk8oU3V3tYTejt9ALRz"
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545'); // Replace with your Ethereum provider URL
const signer = new ethers.Wallet(process.env.PRIVATE_KEY).connect(provider);

async function deployContracts() {
  const mockBob = await ethers.getContractFactory("MockBob");
  mockBobContract = await mockBob.deploy();
  const oracle = await ethers.getContractFactory("AuthorizedMapping");
  oracleContract = await oracle.deploy();

  const Lending = await ethers.getContractFactory("Lending");
  // for local testing
  // lendingContract = await Lending.deploy(mockBobContract.address, zkBobDirectDepositAddress);

  // for fork environment
  lendingContract = await Lending.deploy(bobTokenAddress, zkBobDirectDepositAddress, oracleContract.address);
  // transfer bob to contract address on my local
  await mockBobContract.transfer(lendingContract.address, ethers.utils.parseUnits("100", 18));

  // transfer bob to contract address on testnet
  realBobContract = new ethers.Contract(bobTokenAddress, bobABI, provider);
  await realBobContract.connect(signer).transfer(lendingContract.address, ethers.utils.parseUnits("10", 18));
}

describe("Lending Protocol", function () {
  let mockBobContract;
  let realBobContract;
  let lendingContract;
  async function depositTest() {
    const [owner] = await ethers.getSigners()
    const depositAmount = ethers.utils.parseUnits("10", 18);
    await lendingContract.connect(owner).deposit(depositAmount);
    const depositBalanceOfThisAddress = await lendingContract.bobBalances(owner.address);
    console.log("depositBalanceOfThisAddress", depositBalanceOfThisAddress)
    expect(depositBalanceOfThisAddress).to.equal(depositAmount);
  }

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });
  it("Should deploy Lending Contract", deployContracts);

  describe("Lending", function () {
    beforeEach(async () => {
      const mockBob = await ethers.getContractFactory("MockBob");
      mockBobContract = await mockBob.deploy();
      const oracle = await ethers.getContractFactory("AuthorizedMapping");
      oracleContract = await oracle.deploy();
    
      const Lending = await ethers.getContractFactory("Lending");
      lendingContract = await Lending.deploy(mockBobContract.address, zkBobDirectDepositAddress, oracleContract.address);

      // transfer bob to contract address on testnet
      realBobContract = new ethers.Contract(bobTokenAddress, bobABI, provider);

      // approve
      const [owner] = await ethers.getSigners()
      await mockBobContract.connect(owner).approve(lendingContract.address, ethers.utils.parseUnits("100000000", 18))
      await realBobContract.connect(signer).approve(lendingContract.address, ethers.utils.parseUnits("100000000", 18))
    });
    
    describe("createLoan()", function () {
      beforeEach(async () => {
        await depositTest()
      });
      it("Should be able to create a loan with an 0 interestRate", async function () {
        // transfer bob to contract address
        const [owner] = await ethers.getSigners();
        await mockBobContract.connect(owner).transfer(lendingContract.address, ethers.utils.parseUnits("100", 18));
        
        await lendingContract.connect(owner).createLoan(ethers.utils.parseUnits("10", 18), 0);
        const loan = await lendingContract.loans(owner.address);
        expect(loan.amount).to.equal(ethers.utils.parseUnits("10", 18));
        expect(loan.interestRate).to.equal(0);
      });
      it("Should be able to create a loan with a 10% interestRate", async function () {
        // transfer bob to contract address
        await mockBobContract.transfer(lendingContract.address, ethers.utils.parseUnits("100", 18));

        const [owner] = await ethers.getSigners()
        await lendingContract.connect(owner).createLoan(ethers.utils.parseUnits("10", 18), 10);
        const loan = await lendingContract.loans(owner.address);
        expect(loan.amount).to.equal(ethers.utils.parseUnits("10", 18));
        expect(loan.interestRate).to.equal(10);
        expect(loan.active).to.equal(true);
      });
    });

    describe("repayLoan()", function () {
      beforeEach(async () => {
        await depositTest()
      });
      it("Should be able to repay your loan", async function () {
        const [owner] = await ethers.getSigners()
        const borrowAmount = ethers.utils.parseUnits("10", 18);
        await lendingContract.connect(owner).createLoan(borrowAmount, 10);
        await lendingContract.connect(owner).repayLoan();
        const loan = await lendingContract.loans(owner.address);
        expect(loan.active).to.equal(false);
      });
    });
    describe("deposit()", function () {
      it("Should be able to deposit", async function () {
        await depositTest();
      });
    });
    describe("withdraw()", function () {
      it("Should be able to withdraw", async function () {
        await depositTest();
        const [owner] = await ethers.getSigners()
        const originalUserBobBalance = await mockBobContract.balanceOf(owner.address);
        const withdrawAmount = ethers.utils.parseUnits("10", 18);
        await lendingContract.connect(owner).withdraw(withdrawAmount);
        const depositBalanceOfThisAddress = await lendingContract.bobBalances(owner.address);
        expect(depositBalanceOfThisAddress).to.equal(0);
        const currentUserBobBalance = await mockBobContract.balanceOf(owner.address);
        expect(currentUserBobBalance.sub(originalUserBobBalance)).to.equal(withdrawAmount);
      });
    });
  });
});


function stringToBytes(inputString) {
  const utf8Encoder = new TextEncoder();
  const utf8Bytes = utf8Encoder.encode(inputString);
  const bytes = new Uint8Array(utf8Bytes.length);
  bytes.set(utf8Bytes);
  return bytes
}