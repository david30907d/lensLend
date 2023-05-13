pragma solidity ^0.8.0;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IZkBobDirectDeposits.sol";
import "./oracle.sol";

contract Lending {
    using SafeERC20 for IERC20;
    struct Loan {
        address borrower;
        uint256 amount;
        uint256 interestRate;
        bool active;
    }

    mapping(address => Loan) public loans;
    mapping(address => uint256) public bobBalances;
    IERC20 public bobToken;
    IZkBobDirectDeposits public bobDirectDepositContract;
    AuthorizedMapping public oracle;

    event LoanCreated(
        address indexed borrower,
        uint256 amount,
        uint256 interestRate
    );
    event LoanRepaid(address indexed borrower, uint256 amount);

    constructor(address _bobTokenAddress, address _zkBobDirectDepositAddress, address oracleAddress) {
        // bob token(in Sepolia): 0x2C74B18e2f84B78ac67428d0c7a9898515f0c46f
        bobToken = IERC20(_bobTokenAddress);
        bobDirectDepositContract = IZkBobDirectDeposits(_zkBobDirectDepositAddress);
        oracle = AuthorizedMapping(oracleAddress);
    }

    function createLoan(uint256 _amount, uint256 _interestRate) external {
        require(
            loans[msg.sender].active == false,
            "You already have an active loan"
        );
        require(oracle.getValue(msg.sender) >= _amount, "_amount is greater than authorized amount");
        require(
            bobToken.transfer(msg.sender, _amount),
            "Loan transfer failed"
        );

        Loan memory newLoan = Loan(msg.sender, _amount, _interestRate, true);
        // option A:
        // Option A, through pool contract
        // bobToken.approve(address(bobDirectDepositContract), _amount);
        // uint256 depositId = bobDirectDepositContract.directDeposit(msg.sender, _amount, zkAddress);
        // option B:
        // bobToken.transferAndCall(address(bobDirectDepositContract), _amount, abi.encode(msg.sender, zkAddress));
        loans[msg.sender] = newLoan;
        emit LoanCreated(msg.sender, _amount, _interestRate);
    }

    function repayLoan() external {
        Loan storage loan = loans[msg.sender];
        require(loan.active == true, "No active loan to repay");

        uint256 repaymentAmount = loan.amount +
            ((loan.amount * loan.interestRate) / 100);
        require(
            bobToken.balanceOf(msg.sender) >= repaymentAmount,
            "Insufficient funds"
        );
        loan.active = false;
        emit LoanRepaid(msg.sender, repaymentAmount);

        bobToken.transferFrom(msg.sender, address(this), repaymentAmount);
    }

    function deposit(uint256 amount) external {
        require(
            bobToken.transferFrom(msg.sender, address(this), amount),
            "Deposit failed"
        );
        bobBalances[msg.sender] += amount;
    }

    function withdraw(uint256 amount) external {
        require(bobBalances[msg.sender] >= amount, "Insufficient balance");

        bobBalances[msg.sender] -= amount;
        require(bobToken.transfer(msg.sender, amount), "Withdraw failed");
    }
}
