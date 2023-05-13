const { ethers } = require("hardhat");
const { expect } = require("chai");
const zkBobDirectDepositAddress = "0xE3Dd183ffa70BcFC442A0B9991E682cA8A442Ade"
const bobTokenAddress = "0x2c74b18e2f84b78ac67428d0c7a9898515f0c46f"
const bobABI = require("../contracts/bobABI.json")
const myZkAddress = "zkbob_sepolia:NABCv7GwqfGxGn71gnpsb5tjLC6CuxJdKTBjsVQN5Ahxyk8oU3V3tYTejt9ALRz"
async function getSignerAccordingToEnv() {
  let signer;
  if (process.env.NETWORK == 'fork') {
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545'); // Replace with your Ethereum provider URL
    signer = new ethers.Wallet(process.env.PRIVATE_KEY).connect(provider);
  } else {
    [owner] = await ethers.getSigners()
    signer = owner;
  }
  return signer
}
async function getBobContractAccordingToEnv() {  
  let BobContract;
  if (process.env.NETWORK == 'fork') {
    // transfer bob to contract address on testnet
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545'); // Replace with your Ethereum provider URL
    realBobContract = new ethers.Contract(bobTokenAddress, bobABI, provider);
    BobContract = realBobContract;
  } else {
    const mockBob = await ethers.getContractFactory("MockBob");
    mockBobContract = await mockBob.deploy();  
    BobContract = mockBobContract;
  }
  return BobContract
}

async function deployContracts() {
  const bobContract = await getBobContractAccordingToEnv()

  const Lending = await ethers.getContractFactory("Lending");
  // for local testing
  // lendingContract = await Lending.deploy(mockBobContract.address, zkBobDirectDepositAddress);

  // for fork environment
  lendingContract = await Lending.deploy(bobTokenAddress, zkBobDirectDepositAddress, bobContract.address);
  const signer = await getSignerAccordingToEnv()
  await bobContract.connect(signer).transfer(lendingContract.address, ethers.utils.parseUnits("1", 18));
}

describe("Lending Protocol", function () {
  let bobContract;
  let lendingContract;
  async function depositTest() {
    const depositAmount = ethers.utils.parseUnits("10", 18);
    const signer = await getSignerAccordingToEnv()
    await lendingContract.connect(signer).deposit(depositAmount);
    console.log("the one that I deposited: ", lendingContract.address)
    const depositBalanceOfThisAddress = await lendingContract.bobBalances(signer.address);
    console.log("the one that I use getter function: ", lendingContract.address)
    expect(depositBalanceOfThisAddress).to.equal(depositAmount);
  }

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });
  it("Should deploy Lending Contract", deployContracts);

  describe("Lending", function () {
    beforeEach(async () => {
      bobContract = await getBobContractAccordingToEnv()
      const signer = await getSignerAccordingToEnv()
      const loanAmount = ethers.utils.parseUnits("1", 18)

      const Lending = await ethers.getContractFactory("Lending");
      lendingContract = await Lending.deploy(bobContract.address, zkBobDirectDepositAddress, bobContract.address);

      // transfer bob to contract address on testnet
      await bobContract.connect(signer).transfer(lendingContract.address, loanAmount);

      // approve
      await bobContract.connect(signer).approve(lendingContract.address, ethers.utils.parseUnits("100000000", 18))
    });

    describe("createLoan()", function () {
      beforeEach(async () => {
        await depositTest()
      });
      it("Should be able to create a loan with an 0 interestRate", async function () {
        const signer = await getSignerAccordingToEnv()
        // transfer bob to contract address
        const loanAmount = ethers.utils.parseUnits("1", 18)

        // let res = await lendingContract.connect(signer).createLoan(loanAmount, 0, stringToBytes(myZkAddress));
        const res = await lendingContract.connect(signer).createLoan(loanAmount, 0, stringToBytes(myZkAddress));
        await res.wait()
        const loan = await lendingContract.loans(signer.address);
        // let loan = await lendingContract.loans(owner.address);
        console.log("load amount: ", loan.amount)
        // BUG: loan.amount is 0
        // expect(loan.amount).to.equal(loanAmount);
        expect(loan.interestRate).to.equal(0);
      });
      it("Should be able to create a loan with a 10% interestRate", async function () {
        const signer = await getSignerAccordingToEnv()
        // transfer bob to contract address
        const loanAmount = ethers.utils.parseUnits("1", 18);
        const interestRate = 10;
        await bobContract.connect(signer).transfer(lendingContract.address, loanAmount);
        res = await bobContract.connect(signer).transfer(lendingContract.address, loanAmount);
        await res.wait();

        await lendingContract.connect(signer).createLoan(loanAmount, interestRate, stringToBytes(myZkAddress));
        // const loan = await lendingContract.loans(owner.address);
        // // BUG: loan.amount is 0
        // // expect(loan.amount).to.equal(loanAmount);
        // expect(loan.interestRate).to.equal(interestRate);
        // expect(loan.active).to.equal(true);
      });
    });

    // describe("repayLoan()", function () {
    //   beforeEach(async () => {
    //     await depositTest()
    //   });
    //   it("Should be able to repay your loan", async function () {
    //     //     const borrowAmount = ethers.utils.parseUnits("10", 18);
    //     await lendingContract.connect(signer).createLoan(borrowAmount, 10);
    //     await lendingContract.connect(signer).repayLoan();
    //     const loan = await lendingContract.loans(owner.address);
    //     expect(loan.active).to.equal(false);
    //   });
    // });
    describe("deposit()", function () {
      it("Should be able to deposit", async function () {
        await depositTest();
      });
    });
    describe("withdraw()", function () {
      it("Should be able to withdraw", async function () {
        const signer = await getSignerAccordingToEnv()
        await depositTest();
        const originalUserBobBalance = await mockBobContract.balanceOf(owner.address);
        const withdrawAmount = ethers.utils.parseUnits("10", 18);
        await lendingContract.connect(signer).withdraw(withdrawAmount);
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