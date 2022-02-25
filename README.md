# pnft-contracts

Local test 

```shell
npm install
npx hardhat run scripts/0_deploy_all.js
```

Deploy to Ropsten

```shell
npm install

nano deployments/deploymentConfig.json
# Edit "ropsten" section

nano .env
PK={deployer-private-key},{admin-private-key}
INFURA_KEY=cf15de697f164147878f5e58ec0e9710
ETHERSCAN_API_KEY=JAJQSM9VU6TCH4TDJ1N6JK17BA229EQ7WW

npx hardhat --network ropsten run scripts/0_deploy_all.js
```
