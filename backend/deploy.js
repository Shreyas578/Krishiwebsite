const { ethers } = require("ethers");
require("dotenv").config();
const fs = require("fs");

async function main() {
  console.log("Deploying AgriMarket contract to Sepolia...");
  
  // Provider
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  
  // Wallet
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  console.log("Deployer address:", await wallet.getAddress());
  
  // Contract bytecode and ABI from the compiled contract
  // We'll read the compiled contract from artifacts
  const contractPath = "./artifacts/contracts/AgriMarket.sol/AgriMarket.json";
  
  // Check if artifacts exist, if not we need to compile first
  if (!fs.existsSync(contractPath)) {
    console.log("Contract not compiled. Please compile first with: npx hardhat compile");
    return;
  }
  
  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode;
  
  // Factory
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  // Deploy
  console.log("Deploying contract...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("AgriMarket deployed to:", address);
  
  // Save to .env
  let envContent = fs.readFileSync(".env", "utf8");
  if (envContent.includes("CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${address}`
    );
  } else {
    envContent += `\nCONTRACT_ADDRESS=${address}`;
  }
  fs.writeFileSync(".env", envContent);
  console.log("Contract address saved to .env");
}

main().catch(console.error);
