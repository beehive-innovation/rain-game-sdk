import {
  Addresses,
  eighteenZeros,
  Type,
  Conditions,
} from './utils';

import {
  AddressBook,
  Rain1155,
  price,
  condition,
} from '../dist';
import { ethers } from 'hardhat';

/**
 * Addresses saved that are in SDK BookAddresses deployed to Hardhat network.
 * **These addresses are deterministically generated with the HH signers.**
 */
export let addresses: Addresses;

before('Initializing and deploying contracts to hardhat network', async () => {
  // Contract Factories instances
  // const GameAssetsFactoryFactory = await ethers.getContractFactory(
  //   'GameAssets'
  // );

  // // Deployments to hardhat test network
  // const GameAssetsFactory = await GameAssetsFactoryFactory.deploy();

  // // Saving the addresses to our test
  // addresses = {
  //   GameAssetsFactory: GameAssetsFactory.address,
  // };
});

describe('Rain Game SDK - Test', () => {
  // describe('BookAddress', () => {
  //   it('should fail if no address stored in the book for a chain', () => {
  //     const arbitraryId = 1234;
  //     expect(() => AddressBook.getAddressesForChainId(arbitraryId)).to.throw(
  //       Error,
  //       'No deployed contracts for this chain.'
  //     );
  //   });

  //   it('should get the address directly from the book', () => {
  //     const address = AddressBook.getAddressesForChainId(chainId)
  //       .gameAssetsFactory;
  //     expect(address).to.be.equals(addresses.GameAssetsFactory);
  //   });

  //   it('should get the GameAssetsFactory address', () => {
  //     const address = GameAssets.getBookAddress(chainId);
  //     expect(address).to.be.equals(addresses.GameAssetsFactory);
  //   });
  // });

  it("it Should get deployed contract on mumbai",async () => {
    let signer = await ethers.getSigners();
    let rain1155Address = AddressBook.getAddressesForChainId(80001).rain1155
    let rain1155 = new Rain1155(rain1155Address, signer[0]);

    const Erc20 = await ethers.getContractFactory("Token");
    const stableCoins = await ethers.getContractFactory("ReserveToken");
    const Erc721 = await ethers.getContractFactory("ReserveTokenERC721");
    const Erc1155 = await ethers.getContractFactory("ReserveTokenERC1155");
    
    const USDT = await stableCoins.deploy();
    await USDT.deployed();
    const BNB = await Erc20.deploy("Binance", "BNB");
    await BNB.deployed();
    const SOL = await Erc20.deploy("Solana", "SOL");
    await SOL.deployed();
    const XRP = await Erc20.deploy("Ripple", "XRP");
    await XRP.deployed();

    const BAYC = await Erc721.deploy("Boared Ape Yatch Club", "BAYC");
    await BAYC.deployed()

    const CARS = await Erc1155.deploy();
    await CARS.deployed();
    const PLANES = await Erc1155.deploy();
    await PLANES.deployed();
    const SHIPS = await Erc1155.deploy();
    await SHIPS.deployed();

    const rTKN = await Erc20.deploy("Rain Token", "rTKN");
    await rTKN.deployed()

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

    const [priceScript, currencies] = rain1155.generatePriceScript(prices);
    const priceConfig = rain1155.generatePriceConfig(priceScript, currencies);
    // console.log(priceScript, priceConfig);

    let blockCondition = 15;

    const conditions: condition[] = [
      {
        type: Conditions.NONE
      },
      {
        type: Conditions.BLOCK_NUMBER,
        blockNumber: blockCondition
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

    const canMintScript = rain1155.generateCanMintScript(conditions);
    console.log(canMintScript)
    const canMintConfig = rain1155.generateCanMintConfig(canMintScript);
    console.log(canMintConfig)
  })
});
