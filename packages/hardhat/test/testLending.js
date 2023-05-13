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

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  describe("Lending", function () {
    it("Should deploy Lending Contract", deployContracts);
    
    describe("createLoan()", function () {
      beforeEach(async() => {
        const mockBob = await ethers.getContractFactory("MockBob");
        mockBobContract = await mockBob.deploy();
        
        const Lending = await ethers.getContractFactory("Lending");
        lendingContract = await Lending.deploy(mockBobContract.address);
      
        // transfer bob to contract address
        await mockBobContract.transfer(lendingContract.address, ethers.utils.parseUnits("100", 18));      
      });
      it("Should be able to create a loan with an 0 interestRate", async function () {
        const [owner] = await ethers.getSigners()
        await mockBobContract.connect(owner).approve(lendingContract.address, ethers.utils.parseUnits("1000", 18))
        await lendingContract.connect(owner).createLoan(ethers.utils.parseUnits("10", 18), 0);
        const loan = await lendingContract.loans(owner.address);
        expect(loan.amount).to.equal(ethers.utils.parseUnits("10", 18));
        expect(loan.interestRate).to.equal(0);
      });
      it("Should be able to create a loan with a 10% interestRate", async function () {
        const [owner] = await ethers.getSigners()
        await mockBobContract.connect(owner).approve(lendingContract.address, ethers.utils.parseUnits("1000", 18))
        await lendingContract.connect(owner).createLoan(ethers.utils.parseUnits("10", 18), 10);
        const loan = await lendingContract.loans(owner.address);
        expect(loan.amount).to.equal(ethers.utils.parseUnits("10", 18));
        expect(loan.interestRate).to.equal(10);
      });

      // it("Should emit a SetPurpose event ", async function () {
      //   const [owner] = await ethers.getSigners();

      //   const newPurpose = "Another Test Purpose";

      //   expect(await lendingContract.setPurpose(newPurpose))
      //     .to.emit(lendingContract, "SetPurpose")
      //     .withArgs(owner.address, newPurpose);
      // });
    });
  });
});
