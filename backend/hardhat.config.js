import ethersPlugin from "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";
dotenv.config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL?.trim() || "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY?.trim() || "";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.0",
  plugins: [ethersPlugin],
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111,
      type: "http"
    }
  }
};
