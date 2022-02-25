const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployOnly, toEther, toRole, sleep, getSignature } = require('../scripts/utils');

const _getSignature = async (
    signer,
    user,
    skuId,
    pRewardToken,
    pRewardAmount,
    xRewardToken,
    xRewardAmount,
    prevRewardIndex,
    curRewardIndex
  ) => {
    return getSignature(
        signer, 
        ["address", "uint256", "address", "uint256", "address", "uint256", "uint256", "uint256"],
        [user, skuId, pRewardToken, pRewardAmount, xRewardToken, xRewardAmount, prevRewardIndex, curRewardIndex],  
    );
};

describe("Test All", function () {

    let miner, pNft, usdtToken, mnetToken, wEthToken, wBtcToken;
    let deployer, admin, maintainer, bob;

    beforeEach(async () => {

      [deployer, admin, maintainer, bob] = await ethers.getSigners();

      usdtToken = await deployOnly("ERC20Mock", ["", ""], false);
      mnetToken = await deployOnly("ERC20Mock", ["", ""], false);
      wEthToken = await deployOnly("ERC20Mock", ["", ""], false);
      wBtcToken = await deployOnly("ERC20Mock", ["", ""], false);
      pNft = await deployOnly("PNFT", [admin.address], false);
      miner = await deployOnly("Miner", [admin.address, pNft.address, maintainer.address], false);

      const MINTER_ROLE = toRole("MINTER_ROLE");
      await pNft.connect(admin).grantRole(MINTER_ROLE, miner.address);
    });
  
    // ------------------------------------------------------------------------
    it("Test mockToken", async () => {
      // mint
      let toMint = toEther("10000");
      await usdtToken.connect(maintainer).mint(toMint);
      expect(await usdtToken.balanceOf(maintainer.address)).to.equal(toMint);
    });

    // ------------------------------------------------------------------------
    it("Test sku manage", async () => {

        // Normal add
        for (let skuId = 1; skuId < 4; skuId++) {
            let unitPrice = toEther("100");
            let stockSize = 100 + skuId;
            let liftTime = 60 * 24 * 365;

            await miner.connect(admin).addSku(skuId, unitPrice, stockSize, usdtToken.address, wBtcToken.address, mnetToken.address, liftTime);

            let skuInfo = await miner.skus(skuId);
            expect(skuInfo.unitPrice).to.equal(unitPrice);
            expect(skuInfo.stockSize).to.equal(stockSize);
            expect(skuInfo.paymentToken).to.equal(usdtToken.address);
            expect(skuInfo.pRewardToken).to.equal(wBtcToken.address);
            expect(skuInfo.xRewardToken).to.equal(mnetToken.address);
        }

        // Test revert
        let skuId = 4;
        let unitPrice = toEther("100");
        let stockSize = 100;
        let liftTime = 60 * 24 * 365;
        // Forbidden revert
        await expect(
            miner.addSku(skuId, unitPrice, stockSize, usdtToken.address, wBtcToken.address, mnetToken.address, liftTime)
        ).to.be.reverted;
        // Duplicate revert
        await expect(
            miner.connect(admin).addSku(1, unitPrice, stockSize, usdtToken.address, wBtcToken.address, mnetToken.address, liftTime)
        ).to.be.reverted;

        // Test update
        let skuInfo = await miner.skus(1);
        await miner.connect(admin).updateSku(1, skuInfo.unitPrice, 0);
        let newSkuInfo = await miner.skus(1);
        expect(newSkuInfo.stockSize).to.equal(0);

        await expect(
            miner.updateSku(1, skuId.unitPrice, 0)
        ).to.be.reverted;

    });

    // ------------------------------------------------------------------------
    it("Test token purchase", async () => {

        let skuId = 1;
        let unitPrice = toEther("100");
        let stockSize = 10;
        let liftTime = 60 * 24 * 365;
        await miner.connect(admin).addSku(skuId, unitPrice, stockSize, usdtToken.address, wBtcToken.address, mnetToken.address, liftTime);

        // Prepare fund
        let size = stockSize - 2;
        let paymentAmount = unitPrice.mul(size);
        let toMint = paymentAmount.add(unitPrice);
        await usdtToken.connect(bob).mint(toMint);
        let curBalance = await usdtToken.balanceOf(bob.address);
        expect(curBalance).to.equal(toMint);

        // Purchase
        await usdtToken.connect(bob).approve(miner.address, paymentAmount);
        let tx = await miner.connect(bob).purchase(skuId, size);
        let re = await tx.wait();
        evPurchased = re.events?.filter((x) => {return x.event == "Purchased"})[0].args;
        let tokenId = evPurchased.tokenId;
        expect(tokenId).to.equal(1);

        // Check balance
        curBalance = await usdtToken.balanceOf(bob.address);
        expect(curBalance).to.equal(toMint.sub(paymentAmount));

        // Check NFT
        // let tokenURI = await pNft.tokenURI(tokenId);
        // console.log("tokenURI:", tokenURI);

        let meta = await pNft.getMeta(tokenId);
        // console.log("meta:", meta);
        expect(meta.skuId).to.equal(skuId);
        expect(meta.size).to.equal(size);

        // Purchase no enough balance
        await expect(
            miner.connect(bob).purchase(skuId, 2)
        ).to.be.reverted;

        // Purchase no enough stock
        await expect(
            miner.connect(bob).purchase(skuId, 3)
        ).to.be.revertedWith("Insufficient stock");

        // Test withdraw
        expect(await usdtToken.balanceOf(miner.address)).to.equal(paymentAmount);
        await expect(
            miner.withdrawFund(usdtToken.address, admin.address, paymentAmount)
        ).to.reverted;

        await miner.connect(admin).withdrawFund(usdtToken.address, admin.address, paymentAmount)
        expect(await usdtToken.balanceOf(admin.address)).to.equal(paymentAmount);

        // Test pause
        await expect(
            miner.pause()
        ).to.be.reverted;
        await miner.connect(admin).pause();

        await expect(
            miner.connect(bob).purchase(0, size)
        ).to.be.revertedWith("Pausable: paused");

        await miner.connect(admin).unpause();
        await expect(
            miner.connect(bob).purchase(0, size)
        ).to.be.revertedWith("SkuId not existed");
    });
  
    // ------------------------------------------------------------------------
    it("Test claim", async () => {

        // Prepare sku
        let skuId = 1;
        let unitPrice = toEther("100");
        let stockSize = 100;
        let liftTime = 60 * 24 * 365;
        await miner.connect(admin).addSku(skuId, unitPrice, stockSize, usdtToken.address, wBtcToken.address, mnetToken.address, liftTime);

        // Prepare fund
        await wBtcToken.connect(deployer).mint(toEther(1));
        await wBtcToken.connect(deployer).transfer(miner.address, toEther(1));
        await mnetToken.connect(deployer).mint(toEther(1));
        await mnetToken.connect(deployer).transfer(miner.address, toEther(1));

        expect(await wBtcToken.balanceOf(miner.address)).to.equal(toEther(1));

        // Calc sig
        let sig = _getSignature(
            maintainer,
            bob.address,

            skuId,
            wBtcToken.address,
            toEther(1),
            mnetToken.address,
            toEther(1),
            0,
            1
        )

        // Claim When paused
        await miner.connect(admin).pause();
        await expect(
            miner.connect(bob).claim(

                skuId,
                wBtcToken.address,
                toEther(1),
                mnetToken.address,
                toEther(1),
                0,
                1,
    
                sig,
            )
        ).to.be.revertedWith("Pausable: paused");
        await miner.connect(admin).unpause();

        // Here we go
        await miner.connect(bob).claim(

            skuId,
            wBtcToken.address,
            toEther(1),
            mnetToken.address,
            toEther(1),
            0,
            1,

            sig,
        )

        // Verify
        expect(await wBtcToken.balanceOf(miner.address)).to.equal(toEther(0));
        expect(await wBtcToken.balanceOf(bob.address)).to.equal(toEther(1));
        expect(await mnetToken.balanceOf(bob.address)).to.equal(toEther(1));

        // Test bad claim
        await expect(
            miner.connect(bob).claim(

            skuId,
            wBtcToken.address,
            toEther(1),
            mnetToken.address,
            toEther(1),
            0,
            1,

            sig)
        ).to.be.revertedWith("Invalid prevRewardIndex");

        await expect(
            miner.connect(bob).claim(

            skuId,
            wBtcToken.address,
            toEther(1),
            mnetToken.address,
            toEther(1),
            1,
            2,

            sig)
        ).to.be.revertedWith("Invalid signer");
    });

    // ------------------------------------------------------------------------
    it("Test misc", async () => {

        // Test update maintainer
        let _maintainer = await miner.maintainer();
        expect(_maintainer).to.equal(maintainer.address);

        let newMaintainer = deployer;
        await expect(
            miner.setMaintainer(newMaintainer.address)
        ).to.be.reverted;
        await miner.connect(admin).setMaintainer(newMaintainer.address)
        _maintainer = await miner.maintainer();
        expect(_maintainer).to.equal(newMaintainer.address);
    });

  });
  