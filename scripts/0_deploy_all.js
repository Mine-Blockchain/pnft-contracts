
const hre = require("hardhat");
const { getSavedContractAddresses, deploy_ct, load_ct, toRole, etherscanVerify } = require('./utils');
let c = require('../deployments/deploymentConfig.json');

async function main() {
  const config = c[hre.network.name];

  // Deploy Tokens
  let usdtToken = "";
  let mnetToken = "";
  let wBtcToken = "";
  let wEthToken = ""
  if (hre.network.name != "mainnet") {
    await deploy_ct("ERC20Mock", "usdtToken", ["USDT Test", "tUSDT"], false);
    await deploy_ct("ERC20Mock", "mnetToken", ["MNET Test", "tMNET"], false);
    await deploy_ct("ERC20Mock", "wBtcToken", ["wBtc Test", "wBtc"], false);
    await deploy_ct("ERC20Mock", "wEthToken", ["wEth Test", "wEth"], false);
    usdtToken = getSavedContractAddresses()[hre.network.name]["usdtToken"];
    mnetToken = getSavedContractAddresses()[hre.network.name]["mnetToken"];
    wBtcToken = getSavedContractAddresses()[hre.network.name]["wBtcToken"];
    wEthToken = getSavedContractAddresses()[hre.network.name]["wEthToken"];
  } else {
    usdtToken = config["usdtToken"];
    mnetToken = config["mnetToken"];
    wBtcToken = config["wBtcToken"];
    wEthToken = config["wEthToken"];
  }

  await deploy_ct("PNFT", "pNftToken", [config["admin"]], true);
  pNftAddr = getSavedContractAddresses()[hre.network.name]["pNftToken"];

  // Deploy Miner
  await deploy_ct("Miner", "miner", [config["admin"], pNftAddr, config["maintainer"]], true);
  minerAddr = getSavedContractAddresses()[hre.network.name]["miner"];

  // Setting
  const MINTER_ROLE = toRole("MINTER_ROLE");
  var admin = await hre.ethers.getSigner(config.admin);
  var pNftToken = await load_ct("PNFT", pNftAddr);
  
  await pNftToken.connect(admin).grantRole(MINTER_ROLE, minerAddr);
  console.log("MINTER_ROLE granted");

  // Verify
  if (hre.network.name == "ropsten") {
    // Verify ERC20s
    await etherscanVerify(usdtToken,["USDT Test", "tUSDT"], false);
    await etherscanVerify(mnetToken,["MNET Test", "tMNET"], false);
    await etherscanVerify(wBtcToken,["wBtc Test", "wBtc"], false);
    await etherscanVerify(wEthToken,["wEth Test", "wEth"], false);
  }
  if (hre.network.name == "ropsten" || hre.network.name == "mainnet") {
    // Verify Miner & pNFT
    await etherscanVerify(pNftAddr,[config["admin"]], true);
    await etherscanVerify(minerAddr,[config["admin"], pNftAddr, config["maintainer"]], true);
  }

  console.log("All Done");
}



main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

