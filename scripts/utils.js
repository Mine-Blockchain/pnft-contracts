
const { BigNumber } = require("@ethersproject/bignumber");
const fs = require('fs')
const path = require('path')
const hre = require("hardhat")
const { upgrades, ethers } = require("hardhat");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');

const getSignature = async (signer, types, vars) => {
    let message = ethers.utils.solidityKeccak256(types, vars);
    let signature = await signer.signMessage(ethers.utils.arrayify(message));
    return signature;
};

const toBigNumber = (v) => {
    return BigNumber.from(v);
}

const toRole = (role) => {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(role));
};

const toEther = (amount) => {
    const weiString = ethers.utils.parseEther(amount.toString());
    return BigNumber.from(weiString);
  };

function getSavedContractAddresses() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/contract-addresses.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function saveContractAddress(network, contract, address) {
    const addrs = getSavedContractAddresses()
    addrs[network] = addrs[network] || {}
    addrs[network][contract] = address
    fs.writeFileSync(path.join(__dirname, `../deployments/contract-addresses.json`), JSON.stringify(addrs, null, '    '))
}

function getSavedContractAbis(env) {
    if(!env) {
        env = 'local'
    }
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/contract-abis.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function saveContractAbis(network, contract, bytecode, env) {
    if(!env) {
        env = 'local'
    }
    const bytecodes = getSavedContractAbis()
    bytecodes[network] = bytecodes[network] || {}
    bytecodes[network][contract] = bytecode
    fs.writeFileSync(path.join(__dirname, `../deployments/contract-abis.json`), JSON.stringify(bytecodes, null, '    '))
}

async function deploy_ct(class_name, name, init_params, use_proxy) {
    console.log("deploying", name);

    // Deploy
    const ct_class = await hre.ethers.getContractFactory(class_name);
    if (use_proxy === false) {
        ct_inst = await ct_class.deploy(...init_params);
    } else {
        ct_inst = await upgrades.deployProxy(ct_class, init_params, {timeout: 0});
    }

    await ct_inst.deployed();
    console.log(name, "contract deployed to:", ct_inst.address);

    // Save
    saveContractAddress(hre.network.name, name, ct_inst.address);
    const artifact = await hre.artifacts.readArtifact(class_name);
    saveContractAbis(hre.network.name, name, artifact.abi, hre.network.name);   
}

async function deployOnly(class_name, init_params, use_proxy) {

    // Deploy
    const ct_class = await hre.ethers.getContractFactory(class_name);
    if (use_proxy === false) {
        ct_inst = await ct_class.deploy(...init_params);
    } else {
        ct_inst = await upgrades.deployProxy(ct_class, init_params);
    }

    await ct_inst.deployed();

    return ct_inst;
}

async function load_ct(class_name, addr) {
    const artifact = await hre.artifacts.readArtifact(class_name);
    return await hre.ethers.getContractAt(artifact.abi, addr);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function etherscanVerify(addr, params, isProxy) {

    let implAddr = addr;
    if (isProxy) {
        implAddr = await getImplementationAddress(ethers.provider, addr);
        params = [];
        console.log("getImplementationAddress:", addr, " -> ", implAddr);
    }
    console.log("Verifying Contract, ImplAddress:", implAddr);
  
    try {
      await hre.run("verify:verify", {
          address: implAddr,
          constructorArguments: params
      }); 
      console.log("Verify Done!");
    } catch (error) {
        if (error.message.toLowerCase().indexOf("already verified") == -1) {
            throw(error);
        } else {
            console.log("Already Verified");
        }
    }
}

async function etherscanVerifyProxy(implAddr, params) {
    console.log("Verifying Contract, ImplAddress:", implAddr);
  
    try {
      await hre.run("verify:verify", {
          address: implAddr,
          constructorArguments: params
      }); 
      console.log("Verify Done!");
    } catch (error) {
        if (error.message.toLowerCase().indexOf("already verified") == -1) {
            throw(error);
        } else {
            console.log("Already Verified");
        }
    }
}

module.exports = {
    saveContractAbis,
    saveContractAddress,
    getSavedContractAbis,
    getSavedContractAddresses,
    deploy_ct,
    load_ct,
    toEther,
    toRole,
    deployOnly,
    sleep,
    getSignature,
    toBigNumber,
    etherscanVerify
}
