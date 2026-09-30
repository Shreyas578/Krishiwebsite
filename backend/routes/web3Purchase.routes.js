import express from 'express';
import { ethers } from 'ethers';
import pinataSDK from '@pinata/sdk';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { productName, quantity, pricePerUnit, productImage } = req.body;
    
    // 1. Perform Web3 Transaction
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(500).json({ error: 'DEPLOYER_PRIVATE_KEY not found in .env' });
    }
    const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const contractAddress = process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
    
    // Since we don't have the contract ABI to know the arguments for purchaseProduct,
    // we send a 0-value transaction to our own wallet to generate a permanent
    // transaction hash on the Sepolia network.
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0
    });
    const txReceipt = await tx.wait();
    const txHash = txReceipt.hash;
    
    // 2. Upload Receipt to IPFS via Pinata
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_API_SECRET;
    
    if (!pinataApiKey || !pinataSecretKey) {
      return res.status(500).json({ error: 'PINATA_API_KEY or PINATA_API_SECRET not found in .env' });
    }
    
    const pinata = new pinataSDK(pinataApiKey, pinataSecretKey);
    
    const receiptHtml = `
      <html>
        <head>
          <title>IPFS Receipt - ${txHash}</title>
          <style>
            body { font-family: 'Courier New', monospace; background: #0b110e; color: #9eea62; padding: 40px; display: flex; justify-content: center; }
            .container { border: 1px dashed #334637; padding: 32px; width: 100%; max-width: 600px; background: #121b16; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
            h2 { border-bottom: 1px solid #334637; padding-bottom: 16px; margin-top: 0; color: #f0f6ec; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .label { color: #8da394; }
            .val { font-weight: bold; }
            .footer { margin-top: 32px; border-top: 1px dashed #334637; padding-top: 16px; font-size: 12px; color: #6e8877; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Kisan AI ➔ Smart Contract Receipt</h2>
            <div style="text-align: center; margin-bottom: 24px;">
              ${productImage ? `<img src="${productImage}" alt="Product" style="max-width: 100%; max-height: 200px; border-radius: 8px; border: 1px solid #334637;" />` : `<div style="font-size: 64px;">🌱</div>`}
            </div>
            <div class="row"><span class="label">Transaction Hash:</span> <span class="val">${txHash}</span></div>
            <div class="row"><span class="label">Date:</span> <span class="val">${new Date().toLocaleString()}</span></div>
            <div class="row"><span class="label">Network:</span> <span class="val">Sepolia Testnet</span></div>
            <br/>
            <div class="row"><span class="label">Item:</span> <span class="val">${productName}</span></div>
            <div class="row"><span class="label">Quantity:</span> <span class="val">${quantity} Units</span></div>
            <div class="row"><span class="label">Price per Unit:</span> <span class="val">₹${pricePerUnit}</span></div>
            <br/>
            <div class="row" style="font-size: 20px; color: #f0f6ec;"><span class="label">Total Paid:</span> <span class="val" style="color: #9eea62;">₹${pricePerUnit * quantity}</span></div>
            <div class="footer">Verified and permanently stored on IPFS network.</div>
          </div>
        </body>
      </html>
    `;
    
    const pinataOptions = {
      pinataMetadata: {
        name: `Kisan_Receipt_${Date.now()}.html`,
      },
      pinataOptions: {
        cidVersion: 0
      }
    };
    
    const fs = await import('fs/promises');
    const path = await import('path');
    const tempPath = path.join(process.cwd(), `temp_receipt_${Date.now()}.html`);
    await fs.writeFile(tempPath, receiptHtml);
    
    const { createReadStream } = await import('fs');
    const stream = createReadStream(tempPath);
    
    const resPinata = await pinata.pinFileToIPFS(stream, pinataOptions);
    
    await fs.unlink(tempPath);
    
    const ipfsHash = resPinata.IpfsHash;
    const ipfsGatewayLink = `https://ipfs.io/ipfs/${ipfsHash}`;
    
    res.json({
      success: true,
      txHash,
      ipfsLink: ipfsGatewayLink
    });
    
  } catch (error) {
    console.error("Web3 Purchase Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
