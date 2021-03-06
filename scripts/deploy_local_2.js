const { ethers, waffle } = require("hardhat");
const colors = require('colors');

const OHMContractABI = require('../artifacts/contracts/BegoikoERC20.sol/BegoikoERC20Token.json').abi;
const IERC20 = require('../artifacts/contracts/BegoikoERC20.sol/IERC20.json').abi;
const routerAbi = require("../artifacts/contracts/mocks/dexRouter.sol/PancakeswapRouter.json").abi;
const factoryAbi = require("../artifacts/contracts/mocks/dexfactory.sol/PancakeswapFactory.json").abi;

async function main() {

    const [deployer] = await ethers.getSigners();

    const provider = waffle.provider;

    var DAO = { address: process.env.DAO };
    console.log('Deploying contracts with the account: ' + deployer.address);
    console.log('Deploying contracts with the account: ' + DAO.address);

    /* --------------- parameters --------------- */
    /////////////////////////////////////
    // Initial staking index
    const initialIndex = '7675210820';

    // First block epoch occurs
    const firstEpochBlock = '6567007';

    // What epoch will be first epoch
    const firstEpochNumber = '1';

    // How many blocks are in each epoch
    const epochLengthInBlocks = '41423'; // 8 hours

    // Initial reward rate for epoch
    const initialRewardRate = '3000';

    // Ethereum 0 address, used when toggling changes in treasury
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    // DAI bond BCV
    const daiBondBCV = '369';

    // WFTM bond BCV
    const wFTMBondBCV = '300';

    // DAILP bond BCV
    const daiLPBondBCV = '500';

    // Bond vesting length in blocks. 33110 ~ 6 hours
    const bondVestingLength = '617143'; // 5 days
    // binbondprice must be greater than 100.
    // Min bond price
    const minBondPrice = '550'; // 5.5 dai

    // Min bond price for Wftm bond
    const minBondPriceWftm = '250'; // 2.5 wftm

    // Min bond price for lp bond
    const minBondPricelp = '100'; // equals to half of dai bond price

    // Max bond payout
    const maxBondPayout = '1000'; // 1%

    // DAO fee for bond
    const bondFee = '200'; // 2%

    // Max debt bond can take on
    const maxBondDebt = '1000000000000000000000000';

    // Initial Bond debt
    const intialBondDebt = '0';

    // Initial Reserver amount
    const initialReserve = '10000000000000'; //=sellAmount(from presale)*2;

    const exchangeRouterAddress = "0x9F17B959Ea3Dcb71499b309624e05670589f5c1A";
    const exchangeFactoryAddress = "0xF6d103538432A33f4DaeFFE6f2189F3Ee5fdD3d6";

    const exchangeRouter = new ethers.Contract(exchangeRouterAddress, routerAbi, deployer);
    const exchangeFactory = new ethers.Contract(exchangeFactoryAddress, factoryAbi, deployer);

    const ohmAddress = "0xb35316CdC763C1BA41938728b011F9c0A3Cf93AB";
    const daiAddress = "0xFFc83c13b22F39A77c4396C55da88D7C7b941669";

    // const daiLP = "0x9c52089815a85108789a18e2e151969d1709f44a";
    const wFTMAddress = "0xf1903E0264FaC93Be0163c142DB647B93b3ce0d4";

    const ohm = new ethers.Contract(ohmAddress, OHMContractABI, deployer);
    const dai = new ethers.Contract(daiAddress, IERC20, deployer);

    {

        tx = await dai.approve(exchangeRouter.address, ethers.utils.parseUnits("1000000", 18));

        tx = await exchangeFactory.createPair(ohm.address, dai.address);
        var daiLP = await exchangeFactory.getPair(ohm.address, dai.address);

    }

    tx = await ohm.approve(exchangeRouter.address, ethers.utils.parseUnits("100000000", 9), { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });

    tx = await dai.approve(exchangeRouter.address, ethers.utils.parseUnits("1000000", 18), { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });

    console.log(ethers.utils.formatUnits(await ohm.allowance(deployer.address, exchangeRouter.address), 9));
    console.log(ethers.utils.formatUnits(await dai.allowance(deployer.address, exchangeRouter.address), 18));

    try {
        //DAI
        var tx = await exchangeRouter.addLiquidity(
            ohm.address,
            dai.address,
            ethers.utils.parseUnits("10", 9),
            ethers.utils.parseUnits("10", 18),
            0,
            0,
            deployer.address,
            "111111111111111111111", { nonce: nonce++, gasLimit: "500000", gasPrice: "200000000000" }
        );
    } catch (err) {
        console.log("err", err)
    }

    // var daiLP = await exchangeFactory.getPair(ohm.address,dai.address);

    var startTIme = new Date().getTime();

    console.log("--------------deploy Begoiko finish----------------")
        // Deploy treasury
        //@dev changed function in treaury from 'valueOf' to 'valueOfToken'... solidity function was coflicting w js object property name
    const Treasury = await ethers.getContractFactory('BegoikoTreasury');
    const treasury = await Treasury.deploy(ohm.address, dai.address, daiLP, initialReserve, 0, { nonce: nonce++ });
    //await treasury.deployed();

    // Deploy bonding calc
    const OlympusBondingCalculator = await ethers.getContractFactory('BegoikoBondingCalculator');
    const olympusBondingCalculator = await OlympusBondingCalculator.deploy(ohm.address, { nonce: nonce++ });
    //await olympusBondingCalculator.deployed();

    // Deploy staking distributor
    const Distributor = await ethers.getContractFactory('Distributor');
    const distributor = await Distributor.deploy(treasury.address, ohm.address, epochLengthInBlocks, firstEpochBlock, { nonce: nonce++ });
    //await distributor.deployed();

    // Deploy sOHM
    const SOHM = await ethers.getContractFactory('sBegoiko');
    const sOHM = await SOHM.deploy({ nonce: nonce++ });
    //await sOHM.deployed();

    // Deploy Staking
    const Staking = await ethers.getContractFactory('BegoikoStaking');
    const staking = await Staking.deploy(ohm.address, sOHM.address, epochLengthInBlocks, firstEpochNumber, firstEpochBlock, { nonce: nonce++ });
    //await staking.deployed();

    // Deploy staking warmpup
    const StakingWarmpup = await ethers.getContractFactory('StakingWarmup');
    const stakingWarmup = await StakingWarmpup.deploy(staking.address, sOHM.address, { nonce: nonce++ });
    //await stakingWarmup.deployed();

    // Deploy staking helper
    const StakingHelper = await ethers.getContractFactory('StakingHelper');
    const stakingHelper = await StakingHelper.deploy(staking.address, ohm.address, { nonce: nonce++ });
    //await stakingHelper.deployed();

    //@dev changed function call to Treasury of 'valueOf' to 'valueOfToken' in BondDepository due to change in Treausry contract
    const DAIBond = await ethers.getContractFactory('BegoikoBondDepository');
    const daiBond = await DAIBond.deploy(ohm.address, dai.address, treasury.address, DAO.address, zeroAddress, { nonce: nonce++ });

    const daiLpBond = await DAIBond.deploy(ohm.address, daiLP, treasury.address, DAO.address, olympusBondingCalculator.address, { nonce: nonce++ });

    const wftmBond = await DAIBond.deploy(ohm.address, wFTMAddress, treasury.address, DAO.address, zeroAddress, { nonce: nonce++ });

    const RedeemHelper = await ethers.getContractFactory('RedeemHelper');
    const redeemHelper = await RedeemHelper.deploy({ nonce: nonce++ });

    console.log("--------------deploy finish----------------")

    {
        // queue and toggle DAI and Frax bond reserve depositor
        var tx = await treasury.queue('0', daiBond.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        await tx.wait();
        tx = await treasury.toggle('0', daiBond.address, zeroAddress, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        await tx.wait();

        tx = await treasury.queue('0', wftmBond.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        await tx.wait();
        tx = await treasury.toggle('0', wftmBond.address, zeroAddress, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        await tx.wait();

        tx = await treasury.queue('2', wFTMAddress, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        await tx.wait();
        tx = await treasury.toggle('2', wFTMAddress, zeroAddress, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        await tx.wait();

        tx = await treasury.queue('0', daiLpBond.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        await tx.wait();
        tx = await treasury.toggle('0', daiLpBond.address, zeroAddress, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        await tx.wait();

        tx = await treasury.queue('5', daiLP, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        await tx.wait();
        tx = await treasury.toggle('5', daiLP, olympusBondingCalculator.address, { nonce: nonce++, gasLimit: "200000", gasPrice: "200000000000" });
        await tx.wait();

        console.log("--------------treasury 1----------------")
            // Set DAI and Frax bond terms
        tx = await daiBond.initializeBondTerms(daiBondBCV, bondVestingLength, minBondPrice, maxBondPayout, bondFee, maxBondDebt, intialBondDebt, { nonce: nonce++ });
        tx = await wftmBond.initializeBondTerms(wFTMBondBCV, bondVestingLength, minBondPriceWftm, maxBondPayout, bondFee, maxBondDebt, intialBondDebt, { nonce: nonce++ });
        tx = await daiLpBond.initializeBondTerms(daiLPBondBCV, bondVestingLength, minBondPricelp, maxBondPayout, bondFee, maxBondDebt, intialBondDebt, { nonce: nonce++ });


        // Set staking for DAI and Frax bond
        tx = await daiBond.setStaking(staking.address, stakingHelper.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        tx = await wftmBond.setStaking(staking.address, stakingHelper.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        tx = await daiLpBond.setStaking(staking.address, stakingHelper.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });


        // Initialize sOHM and set the index
        tx = await sOHM.initialize(staking.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        //await tx.wait();
        tx = await sOHM.setIndex(initialIndex, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        //await tx.wait();

        console.log("-------------- bonds and sBEGO ----------------");

        // set distributor contract and warmup contract
        tx = await staking.setContract('0', distributor.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        await tx.wait();
        tx = await staking.setContract('1', stakingWarmup.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        await tx.wait();

        // Set treasury for OHM token
        tx = await ohm.setVault(treasury.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        // Add staking contract as distributor recipient
        tx = await distributor.addRecipient(staking.address, initialRewardRate, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });

        // queue and toggle reward manager
        tx = await treasury.queue('8', distributor.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        tx = await treasury.toggle('8', distributor.address, zeroAddress, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });

        // queue and toggle deployer reserve depositor
        tx = await treasury.queue('0', deployer.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        tx = await treasury.toggle('0', deployer.address, zeroAddress, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });

        console.log("final : ", deployer.address);
        // queue and toggle liquidity depositor
        tx = await treasury.queue('4', deployer.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });

        tx = await treasury.toggle('4', deployer.address, zeroAddress, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });

        tx = await treasury.queue('4', daiLpBond.address, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });

        tx = await treasury.toggle('4', daiLpBond.address, zeroAddress, { nonce: nonce++, gasLimit: "100000", gasPrice: "200000000000" });
        // Stake OHM through helper

        console.log("-------------- staking end ----------------");

        tx = await redeemHelper.addBondContract(daiBond.address, { nonce: nonce++ });
        await tx.wait();
        tx = await redeemHelper.addBondContract(daiLpBond.address, { nonce: nonce++ });
        await tx.wait();
        tx = await redeemHelper.addBondContract(wftmBond.address, { nonce: nonce++ });
        await tx.wait();
    }
    console.log("-------------- environment ----------------");

    console.log(" bego.balanceOf", String(await ohm.balanceOf(deployer.address)));
    console.log(" dai.balanceOf", String(await dai.balanceOf(deployer.address)));
    var end = new Date().getTime();

    console.log("-------------- deploy ended -----------------", (Number(end) - startTIme) / 1000);

    console.log("DAI_ADDRESS: ", dai.address);
    console.log("BEGO_ADDRESS: ", ohm.address);
    console.log("STAKING_ADDRESS: ", staking.address);
    console.log("STAKING_HELPER_ADDRESS: ", stakingHelper.address);
    console.log("SBEGO_ADDRESS: ", sOHM.address);
    console.log("DISTRIBUTOR_ADDRESS: ", distributor.address);
    console.log("BONDINGCALC_ADDRESS: ", olympusBondingCalculator.address);
    console.log("TREASURY_ADDRESS: ", treasury.address);
    console.log("REDEEM_HELPER_ADDRESS: ", redeemHelper.address);

    console.log("DAI ---------- ");
    console.log('bondAddress: "' + daiBond.address + '"');
    console.log('reserveAddress: "' + dai.address + '"');

    console.log("WFTM ---------- ");
    console.log('bondAddress: "' + wftmBond.address + '"');
    console.log('reserveAddress: "' + wFTMAddress + '"');

    console.log('LP ---------- "');
    console.log('bondAddress: "' + daiLpBond.address + '"');
    console.log('reserveAddress: "' + daiLP + '"');
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
    })