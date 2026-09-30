import { ethers } from "ethers";
import fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Deploying AgriMarket contract directly with ethers.js...");
  
  const rpcUrl = process.env.SEPOLIA_RPC_URL?.trim();
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  
  if (!rpcUrl || !privateKey) {
    throw new Error("Missing RPC URL or Private Key in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Read artifact
  const artifactPath = "./artifacts/contracts/AgriMarket.sol/AgriMarket.json";
  const artifactData = fs.readFileSync(artifactPath, "utf8");
  const artifact = JSON.parse(artifactData);
  
  // Create factory
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  // Deploy
  const contract = await factory.deploy();
  console.log("Waiting for deployment confirmation...");
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("AgriMarket deployed to:", address);
  
  // Save to .env
  const envPath = ".env";
  let envContent = fs.readFileSync(envPath, "utf8");
  
  if (envContent.includes("CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${address}`
    );
  } else {
    envContent += `\nCONTRACT_ADDRESS=${address}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log("Contract address saved to .env");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
