const { expect } = require("chai");
const { artifacts ,ethers, } = require("hardhat");

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { it } from "mocha";
import type { Rain1155 } from "../typechain/Rain1155";
import type { Token } from "../typechain/Token";
import type { ReserveToken } from "../typechain/ReserveToken";
import type { ReserveTokenERC1155 } from "../typechain/ReserveTokenERC1155";
import type { ReserveTokenERC721 } from "../typechain/ReserveTokenERC721";
import type { ERC20BalanceTierFactory } from "../typechain/ERC20BalanceTierFactory";
import type { ERC20BalanceTier } from "../typechain/ERC20BalanceTier";

import { eighteenZeros, getEventArgs, fetchFile, writeFile, exec, waitForSubgraphToBeSynced, fetchSubgraph } from "./utils"
import { Contract } from "ethers";
import path from "path";

import { price, condition, Type, Conditions, Rain1155 as Rain1155SDK, AssetConfig} from '../dist'
import { ApolloFetch, FetchResult } from "apollo-fetch";
const LEVELS = Array.from(Array(8).keys()).map((value) =>
  ethers.BigNumber.from(++value + eighteenZeros)
); // [1,2,3,4,5,6,7,8]

export let rain1155: Rain1155
export let rain1155SDK: Rain1155SDK

export let USDT: ReserveToken

export let BNB: Token
export let SOL: Token
export let XRP: Token
export let rTKN: Token

export let BAYC: ReserveTokenERC721

export let CARS: ReserveTokenERC1155
export let PLANES: ReserveTokenERC1155
export let SHIPS: ReserveTokenERC1155

export let erc20BalanceTier: ERC20BalanceTier

export let owner: SignerWithAddress,
  creator: SignerWithAddress,
  creator2: SignerWithAddress,
  buyer1: SignerWithAddress,
  buyer2: SignerWithAddress,
  gameAsstesOwner: SignerWithAddress,
  admin: SignerWithAddress

const subgraphName = "vishalkale151071/blocks";

export let subgraph: ApolloFetch;
export let subgraphFlag = false;

before("Deploy Rain1155 Contract and subgraph", async function () {
  const signers = await ethers.getSigners();

  owner = signers[0];
  creator = signers[1];
  creator2 = signers[2];
  buyer1 = signers[3];
  buyer2 = signers[4];
  gameAsstesOwner = signers[5];
  admin = signers[6];


  let Rain1155 = await ethers.getContractFactory("Rain1155")
  
  rain1155 = await Rain1155.deploy()

  await rain1155.deployed();

  rain1155SDK = new Rain1155SDK(rain1155.address, owner);

  const Erc20 = await ethers.getContractFactory("Token");
  const stableCoins = await ethers.getContractFactory("ReserveToken");
  const Erc721 = await ethers.getContractFactory("ReserveTokenERC721");
  const Erc1155 = await ethers.getContractFactory("ReserveTokenERC1155");
  
  USDT = await stableCoins.deploy();
  await USDT.deployed();
  BNB = await Erc20.deploy("Binance", "BNB");
  await BNB.deployed();
  SOL = await Erc20.deploy("Solana", "SOL");
  await SOL.deployed();
  XRP = await Erc20.deploy("Ripple", "XRP");
  await XRP.deployed();

  BAYC = await Erc721.deploy("Boared Ape Yatch Club", "BAYC");
  await BAYC.deployed()

  CARS = await Erc1155.deploy();
  await CARS.deployed();
  PLANES = await Erc1155.deploy();
  await PLANES.deployed();
  SHIPS = await Erc1155.deploy();
  await SHIPS.deployed();

  rTKN = await Erc20.deploy("Rain Token", "rTKN");
  await rTKN.deployed()

  const erc20BalanceTierFactoryFactory = await ethers.getContractFactory("ERC20BalanceTierFactory");
  const erc20BalanceTierFactory = (await erc20BalanceTierFactoryFactory.deploy()) as ERC20BalanceTierFactory & Contract;
  await erc20BalanceTierFactory.deployed()

  const tx = await erc20BalanceTierFactory.createChildTyped({
    erc20: rTKN.address,
    tierValues: LEVELS
  });

  erc20BalanceTier = new ethers.Contract(
    ethers.utils.hexZeroPad(
      ethers.utils.hexStripZeros(
        (await getEventArgs(tx, "NewChild", erc20BalanceTierFactory)).child
      ),
      20
    ),
    (await artifacts.readArtifact("ERC20BalanceTier")).abi,
    owner
  ) as ERC20BalanceTier & Contract;

  await erc20BalanceTier.deployed();

  const pathExampleConfig = path.resolve(__dirname, "../config/localhost.json");
  const config = JSON.parse(fetchFile(pathExampleConfig));

  config.network = "localhost";

  config.rain1155 = rain1155SDK.address;
  config.rain1155Block = rain1155.deployTransaction.blockNumber;

  const pathConfigLocal = path.resolve(__dirname, "../config/localhost.json");
  writeFile(pathConfigLocal, JSON.stringify(config, null, 2));

  // try {
  //   exec(`npm run deploy:localhost`);
  //   subgraph = fetchSubgraph(subgraphName);
  //   await waitForSubgraphToBeSynced(1000);

  //   subgraphFlag = true;
  // }catch(error){
  //   subgraphFlag = false;
  //   console.log(`Subgraph deployment failed : ${error}`);
  // }

  // if(subgraphFlag){
  //   await waitForSubgraphToBeSynced(1000);

  //   const queryResult = (await subgraph({
  //     query:`{
  //       rain1155(id: "${rain1155.address}"){
  //         id
  //       }
  //     }`
  //   })) as FetchResult;
  //   console.log(JSON.stringify(queryResult, null,2));

    // expect(queryResult.data.rain1155.id).to.equals(rain1155.address_);
    // console.log("subgraph tested");
  // }
})

describe("Rain1155 Test", function () {
  it("Contract should be deployed.", async function () {
    expect(rain1155SDK.address).to.be.not.null;
  });

  it("Should deploy all tokens", async function () {
    expect(USDT.address).to.be.not.null;
    expect(BNB.address).to.be.not.null;
    expect(SOL.address).to.be.not.null;
    expect(XRP.address).to.be.not.null;
    // console.log(USDT.address, BNB.address, SOL.address, XRP.address)
  });

  it("Should create asset from creator.", async function () {

    const prices: price[] = [
      {
        currency:{
          type: Type.ERC20,
          address: USDT.address,
        },
        amount: ethers.BigNumber.from("1" + eighteenZeros)
      },
      {
        currency:{
          type: Type.ERC20,
          address: BNB.address,
        },
        amount: ethers.BigNumber.from("25" + eighteenZeros)
      },
      {
        currency:{
          type: Type.ERC1155,
          address: CARS.address,
          tokenId: 5,
        },
        amount: ethers.BigNumber.from("10")
      },
      {
        currency:{
          type: Type.ERC1155,
          address: PLANES.address,
          tokenId: 15,
        },
        amount: ethers.BigNumber.from("5")
      },
    ] ;

    const [priceConfig, currencies] = rain1155SDK.generatePriceScript(prices);
    const priceScript = rain1155SDK.generatePriceConfig(priceConfig, currencies);

    const tierCondition = 4
    const blockCondition = 15

    const conditions: condition[] = [
      // {
      //   type: Conditions.NONE
      // }
      {
        type: Conditions.BLOCK_NUMBER,
        blockNumber: blockCondition
      },
      {
        type: Conditions.BALANCE_TIER,
        tierAddress: erc20BalanceTier.address,
        tierCondition: tierCondition
      },
      {
        type: Conditions.ERC20BALANCE,
        address: SOL.address,
        balance: ethers.BigNumber.from("10" + eighteenZeros)
      },
      {
        type: Conditions.ERC721BALANCE,
        address: BAYC.address,
        balance: ethers.BigNumber.from("0")
      },
      {
        type: Conditions.ERC1155BALANCE,
        address: SHIPS.address,
        id: ethers.BigNumber.from("1"),
        balance: ethers.BigNumber.from("10")
      }
    ];

    const canMintConfig = rain1155SDK.generateCanMintScript(conditions);

    const assetConfig: AssetConfig = {
      lootBoxId: ethers.BigNumber.from("0"),
      priceScript: priceConfig,
      canMintScript: canMintConfig,
      currencies: currencies,
      name: "F1",
      description: "BRUUUUMMM BRUUUMMM",
      recipient: creator.address,
      tokenURI: "URI",
    }

    await rain1155SDK.connect(gameAsstesOwner).createNewAsset(assetConfig);

    let assetData = await rain1155SDK.assets(1)
    let expectAsset = {
      lootBoxId: assetData.lootBoxId,
      tokenURI: assetData.tokenURI,
      creator: assetData.recipient,
    }

    expect(expectAsset).to.deep.equals({
      lootBoxId: ethers.BigNumber.from("0"),
      tokenURI: "URI",
      creator: creator.address,
    })
  });

  it("Should buy asset '1'", async function() {
    console.log(await rain1155SDK.canMint(1, buyer1.address));
    await rTKN.connect(buyer1).mintTokens(5)

    await USDT.connect(buyer1).mintTokens(1);
    await BNB.connect(buyer1).mintTokens(25);

    await SOL.connect(buyer1).mintTokens(11);

    await BAYC.connect(buyer1).mintNewToken();
    
    
    await CARS.connect(buyer1).mintTokens(ethers.BigNumber.from("5"), 10);
    await PLANES.connect(buyer1).mintTokens(ethers.BigNumber.from("15"), 5);
    await SHIPS.connect(buyer1).mintTokens(ethers.BigNumber.from("1"), 11);

    await USDT.connect(buyer1).approve(rain1155.address, ethers.BigNumber.from("1" + eighteenZeros));
    await BNB.connect(buyer1).approve(rain1155.address, ethers.BigNumber.from("25" + eighteenZeros));
    await CARS.connect(buyer1).setApprovalForAll(rain1155.address, true);
    await PLANES .connect(buyer1).setApprovalForAll(rain1155.address, true);

  
    console.log(await rain1155SDK.canMint(1, buyer1.address));
    
    await rain1155SDK.connect(buyer1).mintAssets(1,1);

    expect(await rain1155SDK.uri(1)).to.equals("URI")

    expect(await rain1155SDK.balanceOf(buyer1.address, 1)).to.deep.equals(ethers.BigNumber.from("1"))

  });
});
