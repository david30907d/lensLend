pragma solidity ^0.8.0;
import "hardhat/console.sol";

interface IERC20 {
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract Lending {
    struct Loan {
        address borrower;
        uint256 amount;
        uint256 interestRate;
        bool active;
    }

    mapping(address => Loan) public loans;
    mapping(address => uint256) public bobBalances;
    IERC20 public bobToken;

    event LoanCreated(
        address indexed borrower,
        uint256 amount,
        uint256 interestRate
    );
    event LoanRepaid(address indexed borrower, uint256 amount);

    constructor(address _bobTokenAddress) {
        // bob token(in Sepolia): 0x2C74B18e2f84B78ac67428d0c7a9898515f0c46f
        bobToken = IERC20(_bobTokenAddress);
    }

    function createLoan(uint256 _amount, uint256 _interestRate) external {
        require(
            loans[msg.sender].active == false,
            "You already have an active loan"
        );

        require(
            bobToken.transferFrom(msg.sender, address(this), _amount),
            "Loan transfer failed"
        );

        Loan memory newLoan = Loan(msg.sender, _amount, _interestRate, true);
        // // TODO(david): use direct deposit
        // direct_deposit(zk_address, _amount);
        loans[msg.sender] = newLoan;
        // console.log("newLoan", msg.sender, newLoan);
        console.log(
            newLoan.borrower,
            newLoan.amount,
            newLoan.interestRate,
            newLoan.active
        );
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

        bobToken.transfer(msg.sender, repaymentAmount);
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
