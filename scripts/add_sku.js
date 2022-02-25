
const hre = require("hardhat");
const { getSavedContractAddresses, load_ct, toEther } = require('./utils');

main = async () => {
    
    let deployer, admin;

    [deployer, admin] = await ethers.getSigners();
    let addresses = getSavedContractAddresses()[hre.network.name];
    let miner = await load_ct("Miner", addresses["miner"]);
    
    let usdtToken = await load_ct("ERC20Mock", addresses["usdtToken"]);
    let mnetToken = await load_ct("ERC20Mock", addresses["mnetToken"]);
    let wEthToken = await load_ct("ERC20Mock", addresses["wEthToken"]);
    let wBtcToken = await load_ct("ERC20Mock", addresses["wBtcToken"]);

    let skuId = 1;
    let stockSize = 10000;
    let unitPrice = toEther(910);
    let liftTime = 60 * 24 * 200;
    await miner.connect(admin).addSku(skuId, unitPrice, stockSize, usdtToken.address, wBtcToken.address, mnetToken.address, liftTime);
    console.log("sku", skuId, "added");
    
    skuId = 2;
    unitPrice = toEther(35);
    liftTime = 60 * 24 * 360;
    await miner.connect(admin).addSku(skuId, unitPrice, stockSize, usdtToken.address, wEthToken.address, mnetToken.address, liftTime);
    console.log("sku", skuId, "added");
}

main()
.then(() => process.exit(0))
.catch((error) => {
  console.error("Caught Error:", error);
  process.exit(1);
});
