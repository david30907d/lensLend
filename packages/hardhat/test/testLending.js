const { ethers } = require("hardhat");
const { expect } = require("chai");

async function deployContracts(){
  const mockBob = await ethers.getContractFactory("MockBob");
  mockBobContract = await mockBob.deploy();
  
  const Lending = await ethers.getContractFactory("Lending");
  lendingContract = await Lending.deploy(mockBobContract.address);

  // transfer bob to contract address
  await mockBobContract.transfer(lendingContract.address, ethers.utils.parseUnits("100", 18));

}

describe("Lending Protocol", function () {
  let mockBobContract;
  let lendingContract;
  async function depositTest(){
    const [owner] = await ethers.getSigners()
    const depositAmount = ethers.utils.parseUnits("10", 18);
    await lendingContract.connect(owner).deposit(depositAmount);
    const depositBalanceOfThisAddress = await lendingContract.bobBalances(owner.address);
    expect(depositBalanceOfThisAddress).to.equal(depositAmount);
  }

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });
  it("Should deploy Lending Contract", deployContracts);

  describe("Lending", function () {
    beforeEach(async() => {
      const mockBob = await ethers.getContractFactory("MockBob");
      mockBobContract = await mockBob.deploy();
      
      const Lending = await ethers.getContractFactory("Lending");
      lendingContract = await Lending.deploy(mockBobContract.address);
    
      // approve
      const [owner] = await ethers.getSigners()
      await mockBobContract.connect(owner).approve(lendingContract.address, ethers.utils.parseUnits("1000", 18))
    });
    
    describe("createLoan()", function () {
      beforeEach(async() => {
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
      // it("Should be able to deposit", async function () {
      //   const [owner] = await ethers.getSigners()
      //   await mockBobContract.connect(owner).approve(lendingContract.address, ethers.utils.parseUnits("1000", 18))
      //   await lendingContract.connect(owner).createLoan(ethers.utils.parseUnits("10", 18), 10);
      //   const loan = await lendingContract.loans(owner.address);
      //   expect(loan.amount).to.equal(ethers.utils.parseUnits("10", 18));
      //   expect(loan.interestRate).to.equal(10);
      // });

      // it("Should emit a SetPurpose event ", async function () {
      //   const [owner] = await ethers.getSigners();

      //   const newPurpose = "Another Test Purpose";

      //   expect(await lendingContract.setPurpose(newPurpose))
      //     .to.emit(lendingContract, "SetPurpose")
      //     .withArgs(owner.address, newPurpose);
      // });
    });

    describe("repayLoan()", function () {
      beforeEach(async() => {
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
