// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

interface IERC20 {
  function totalSupply() external view returns (uint256);

  function balanceOf(address account) external view returns (uint256);

  function transfer(address recipient, uint256 amount) external returns (bool);

  function allowance(address owner, address spender)
    external
    view
    returns (uint256);

  function approve(address spender, uint256 amount) external returns (bool);
  function burn(uint256 amount) external;

  function transferFrom(
    address sender,
    address recipient,
    uint256 amount
  ) external returns (bool);


  function mintPRESALE(address account_, uint256 amount_) external;

  event Transfer(address indexed from, address indexed to, uint256 value);

  event Approval(address indexed owner, address indexed spender, uint256 value);
}

library SafeMath {
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, "SafeMath: addition overflow");

    return c;
  }

  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    return sub(a, b, "SafeMath: subtraction overflow");
  }

  function sub(
    uint256 a,
    uint256 b,
    string memory errorMessage
  ) internal pure returns (uint256) {
    require(b <= a, errorMessage);
    uint256 c = a - b;

    return c;
  }

  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }

    uint256 c = a * b;
    require(c / a == b, "SafeMath: multiplication overflow");

    return c;
  }

  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    return div(a, b, "SafeMath: division by zero");
  }

  function div(
    uint256 a,
    uint256 b,
    string memory errorMessage
  ) internal pure returns (uint256) {
    require(b > 0, errorMessage);
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold

    return c;
  }
}

library Address {
  function isContract(address account) internal view returns (bool) {
    uint256 size;
    // solhint-disable-next-line no-inline-assembly
    assembly {
      size := extcodesize(account)
    }
    return size > 0;
  }

  function functionCall(
    address target,
    bytes memory data,
    string memory errorMessage
  ) internal returns (bytes memory) {
    return _functionCallWithValue(target, data, 0, errorMessage);
  }

  function _functionCallWithValue(
    address target,
    bytes memory data,
    uint256 weiValue,
    string memory errorMessage
  ) private returns (bytes memory) {
    require(isContract(target), "Address: call to non-contract");

    // solhint-disable-next-line avoid-low-level-calls
    (bool success, bytes memory returndata) = target.call{value: weiValue}(
      data
    );
    if (success) {
      return returndata;
    } else {
      if (returndata.length > 0) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
          let returndata_size := mload(returndata)
          revert(add(32, returndata), returndata_size)
        }
      } else {
        revert(errorMessage);
      }
    }
  }

  function _verifyCallResult(
    bool success,
    bytes memory returndata,
    string memory errorMessage
  ) private pure returns (bytes memory) {
    if (success) {
      return returndata;
    } else {
      if (returndata.length > 0) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
          let returndata_size := mload(returndata)
          revert(add(32, returndata), returndata_size)
        }
      } else {
        revert(errorMessage);
      }
    }
  }
}

library SafeERC20 {
  using SafeMath for uint256;
  using Address for address;

  function safeTransfer(
    IERC20 token,
    address to,
    uint256 value
  ) internal {
    _callOptionalReturn(
      token,
      abi.encodeWithSelector(token.transfer.selector, to, value)
    );
  }

  function safeTransferFrom(
    IERC20 token,
    address from,
    address to,
    uint256 value
  ) internal {
    _callOptionalReturn(
      token,
      abi.encodeWithSelector(token.transferFrom.selector, from, to, value)
    );
  }

  function _callOptionalReturn(IERC20 token, bytes memory data) private {
    bytes memory returndata = address(token).functionCall(
      data,
      "SafeERC20: low-level call failed"
    );
    if (returndata.length > 0) {
      // Return data is optional
      // solhint-disable-next-line max-line-length
      require(
        abi.decode(returndata, (bool)),
        "SafeERC20: ERC20 operation did not succeed"
      );
    }
  }
}

interface IOwnable {
  function owner() external view returns (address);

  function renounceOwnership() external;

  function transferOwnership(address newOwner_) external;
}

contract Ownable is IOwnable {
  address internal _owner;

  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );

  constructor() {
    _owner = msg.sender;
    emit OwnershipTransferred(address(0), _owner);
  }

  function owner() public view override returns (address) {
    return _owner;
  }

  modifier onlyOwner() {
    require(_owner == msg.sender, "Ownable: caller is not the owner");
    _;
  }

  function renounceOwnership() public virtual override onlyOwner {
    emit OwnershipTransferred(_owner, address(0));
    _owner = address(0);
  }

  function transferOwnership(address newOwner_)
    public
    virtual
    override
    onlyOwner
  {
    require(newOwner_ != address(0), "Ownable: new owner is the zero address");
    emit OwnershipTransferred(_owner, newOwner_);
    _owner = newOwner_;
  }
}

interface IPancakeswapRouter{
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
}

contract Presale is Ownable {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  address public DAO;

  address public begoTOKEN;
  address public dai;

  uint256 public minAmount;
  uint256 public maxAmount;
  uint256 public totalAmont;
  uint256 public sellAmount;

  bool public openIdo = false;
  uint256 public saleStartTime;
  uint256 public privateSalePeriod = 1 days;
  uint256 public publicSalePeriod = 2 days;
  uint256 public claimTime = 1 hours;
  mapping(address => uint256) public purchasedAmount;
  mapping(address => uint256) public claimedAmount; 
  mapping(address => uint256) public claimedTime;
  uint256 public claimInterval = 1 days;

  mapping(address => bool) public boughtTokens;
  enum LEVELS { NOT_LISTED, CONTEST_RAFFLE, BOOST, BRONZE, PLATIUM, GOLDEN, OG }
  mapping(address => LEVELS) public whiteListed;
  mapping(LEVELS => uint256) public salePrice;
  mapping(LEVELS => uint8) public numberOfMembers;
  mapping(LEVELS => uint256) public maxPurchaseAmount;
  mapping(LEVELS => uint8) public membersForLevels;

  uint256 public addLiquidityTime;

  constructor() {
  }

  function whitelistUsers(address[] memory addresses, LEVELS level) public onlyOwner {
    for (uint256 i = 0; i < addresses.length; i++) {
      if(whiteListed[addresses[i]] == LEVELS.NOT_LISTED) {
        membersForLevels[level] = membersForLevels[level]+1;
        whiteListed[addresses[i]] = level;
      }
    }
    require(membersForLevels[level] <= numberOfMembers[level], "Number of members exceeds.");
  }

  function unwhitelistUsers(address[] memory addresses) public onlyOwner {
    for (uint256 i = 0; i < addresses.length; i++) {      
      if(whiteListed[addresses[i]] != LEVELS.NOT_LISTED) {
        membersForLevels[whiteListed[addresses[i]]] = membersForLevels[whiteListed[addresses[i]]]-1;
        whiteListed[addresses[i]] = LEVELS.NOT_LISTED;
      }
    }
  }

  function initialize(
    address _begoTOKEN,
    address _dai,
    uint256 _minAmount,
    uint256 _maxAmount,
    uint256 _totalAmont,
    address _DAO
  ) external onlyOwner returns (bool) {
    begoTOKEN = _begoTOKEN;
    dai = _dai;
    minAmount = _minAmount;
    maxAmount = _maxAmount;
    totalAmont = _totalAmont;
    DAO = _DAO;
    return true;
  }

  function setOpen(bool _open) external onlyOwner {
    openIdo = _open;
    saleStartTime = block.timestamp;
  }

  function isWhitelisted(address _user) public view returns (LEVELS) {
    return whiteListed[_user];
  }

  function purchase(uint256 _val) external returns (bool) {
    require(openIdo == true, "IDO is closed");
    require(
      boughtTokens[msg.sender] == false,
      "You've already participated to the IDO."
    );
    uint256 nowTime = block.timestamp;
    uint256 _purchaseAmount = _calculateSaleQuote(_val);
    require(_purchaseAmount >= minAmount, "Below minimum allocation");
    require(_purchaseAmount <= maxAmount, "More than allocation");
    sellAmount = sellAmount.add(_purchaseAmount);
    require(sellAmount <= totalAmont, "The amount entered exceeds IDO Goal");

    if (nowTime < saleStartTime.add(privateSalePeriod)) {
      require(whiteListed[msg.sender] != LEVELS.NOT_LISTED, "You're not Whitelisted.");
      uint256 _maxPurchaseAmount = maxPurchaseAmount[whiteListed[msg.sender]];
      require(_purchaseAmount <= _maxPurchaseAmount, "The amount entered exceeds max amout.");
    } else {
      require(nowTime < saleStartTime.add(privateSalePeriod).add(publicSalePeriod), "Presale is finished.");
    }

    boughtTokens[msg.sender] = true;
    IERC20(dai).safeTransferFrom(msg.sender, address(this), _val);
    IERC20(begoTOKEN).mintPRESALE(address(this), _purchaseAmount.mul(2));
    purchasedAmount[msg.sender] = _purchaseAmount;
    return true;
  }

  function claim() external returns (bool) {
    // To do
    require(addLiquidityTime.add(claimTime) < block.timestamp, "Can't claim now. please wait.");
    uint256 _purchaseAmount = purchasedAmount[msg.sender];
    require(_purchaseAmount > 0, "Can't claim.");
    require(block.timestamp.sub(claimedTime[msg.sender]) > claimInterval, "Can't claim now");
    require(_purchaseAmount > claimedAmount[msg.sender], "Can't claim any more.");
    uint256 claimAmount = _purchaseAmount.div(5);
    IERC20(begoTOKEN).safeTransfer(msg.sender, claimAmount);
    claimedAmount[msg.sender] = claimedAmount[msg.sender].add(claimAmount);
    claimedTime[msg.sender] = block.timestamp;
    return true;
  }      

  function addLiquidity(IPancakeswapRouter router, uint256 begoPrice) external onlyOwner {
    // To do
    uint256 daiAmount = IERC20(dai).balanceOf(address(this));
    uint256 begoAmount = IERC20(begoTOKEN).balanceOf(address(this));

    uint256 liquidityDaiAmount = daiAmount.div(2);
    uint256 liquidityBegoAmount = _calculateSaleQuoteWithPrice(liquidityDaiAmount, begoPrice);
    require(liquidityBegoAmount <= begoAmount, "Insufficient bego amount.");

    IERC20(dai).approve(address(router), liquidityDaiAmount);
    IERC20(begoTOKEN).approve(address(router), liquidityBegoAmount);
    router.addLiquidity(
      address(dai),
      address(begoTOKEN),
      liquidityDaiAmount,
      liquidityBegoAmount,
      0,
      0,
      DAO,
      111111111111111111111
    );
    IERC20(dai).safeTransfer(DAO, IERC20(dai).balanceOf(address(this)));
    IERC20(begoTOKEN).burn(IERC20(begoTOKEN).balanceOf(address(this)));
    addLiquidityTime = block.timestamp;
  }

  function setAllocation(uint256 _minAmount, uint256 _maxAmount)
    external
    onlyOwner
  {
    minAmount = _minAmount;
    maxAmount = _maxAmount;
  }

  function setMaxPurchase(LEVELS level, uint256 _maxAmount)
    external
    onlyOwner
  {
    maxPurchaseAmount[level] = _maxAmount;
  }

  function setNumberOfMembers(LEVELS level, uint8 _number)
    external
    onlyOwner
  {
    numberOfMembers[level] = _number;
  }

  function setSalePrice(LEVELS level, uint256 _salePrice)
    external
    onlyOwner
  {
    salePrice[level] = _salePrice;
  }

  function _calculateSaleQuote(uint256 paymentAmount_)
    internal
    view
    returns (uint256)
  {
    return uint256(1e9).mul(paymentAmount_).div(salePrice[whiteListed[msg.sender]]);
  }

  function _calculateSaleQuoteWithPrice(uint256 paymentAmount_, uint256 price)
    internal
    pure
    returns (uint256)
  {
    return uint256(1e9).mul(paymentAmount_).div(price);
  }

  function calculateSaleQuote(uint256 paymentAmount_)
    external
    view
    returns (uint256)
  {
    return _calculateSaleQuote(paymentAmount_);
  }
}