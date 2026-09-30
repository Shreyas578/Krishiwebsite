import { ethers } from 'ethers';
import db from '../config/db.js';

/**
 * Blockchain Payment Controller
 * Handles all cryptocurrency transactions for marketplace orders
 * Backend manages gas fees using wallet secret - farmers don't interact with blockchain directly
 */

// Initialize provider and wallet
const getProvider = () => {
  return new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
};

const getWallet = () => {
  const provider = getProvider();
  return new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
};

// Load contract ABI
const CONTRACT_ABI = [
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function balanceOf(address account) public view returns (uint256)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) public returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Payment(address indexed buyer, address indexed seller, uint256 amount, string orderId)',
];

/**
 * Initialize Payment - Create a payment intent for an order
 * POST /api/payments/initialize
 */
export async function initializePayment(req, res) {
  try {
    const { orderId, buyerId, sellerId, amount, currency = 'USDC' } = req.body;

    // Validation
    if (!orderId || !buyerId || !sellerId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId, buyerId, sellerId, amount',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    // Get order details from database
    const order = await new Promise((resolve, reject) => {
      db.query(
        'SELECT * FROM orders WHERE id = ? AND buyer_id = ?',
        [orderId, buyerId],
        (err, results) => {
          if (err) reject(err);
          resolve(results?.[0]);
        }
      );
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Create payment record in database
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date();

    await new Promise((resolve, reject) => {
      db.query(
        `INSERT INTO blockchain_payments 
        (payment_id, order_id, buyer_id, seller_id, amount, currency, status, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, DATE_ADD(?, INTERVAL 1 HOUR))`,
        [paymentId, orderId, buyerId, sellerId, amount, currency, createdAt, createdAt],
        (err, results) => {
          if (err) reject(err);
          resolve(results);
        }
      );
    });

    res.json({
      success: true,
      data: {
        paymentId,
        orderId,
        amount,
        currency,
        status: 'pending',
        message: 'Payment initialized. Ready for transaction.',
      },
    });
  } catch (error) {
    console.error('Error initializing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message,
    });
  }
}

/**
 * Process Payment - Execute blockchain transaction
 * Backend handles all gas fees using wallet secret
 * POST /api/payments/process
 */
export async function processPayment(req, res) {
  try {
    const { paymentId, buyerWalletAddress, sellerWalletAddress } = req.body;

    if (!paymentId || !buyerWalletAddress || !sellerWalletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Get payment record
    const payment = await new Promise((resolve, reject) => {
      db.query(
        'SELECT * FROM blockchain_payments WHERE payment_id = ? AND status = ?',
        [paymentId, 'pending'],
        (err, results) => {
          if (err) reject(err);
          resolve(results?.[0]);
        }
      );
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or already processed',
      });
    }

    // Check payment expiration
    const expiresAt = new Date(payment.expires_at);
    if (new Date() > expiresAt) {
      await updatePaymentStatus(paymentId, 'expired');
      return res.status(400).json({
        success: false,
        message: 'Payment expired. Please create a new payment.',
      });
    }

    try {
      // Initialize wallet (backend pays gas fees)
      const wallet = getWallet();
      const contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        CONTRACT_ABI,
        wallet
      );

      // Convert amount to Wei (assuming 6 decimals for USDC)
      const amountInWei = ethers.parseUnits(payment.amount.toString(), 6);

      // Execute transfer transaction
      // Backend wallet pays gas, transaction goes from buyer to seller
      const tx = await contract.transferFrom(
        buyerWalletAddress,
        sellerWalletAddress,
        amountInWei
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      // Update payment status in database
      await new Promise((resolve, reject) => {
        db.query(
          `UPDATE blockchain_payments 
          SET status = ?, tx_hash = ?, block_number = ?, confirmed_at = NOW()
          WHERE payment_id = ?`,
          ['completed', receipt.hash, receipt.blockNumber, paymentId],
          (err, results) => {
            if (err) reject(err);
            resolve(results);
          }
        );
      });

      // Update order status
      await new Promise((resolve, reject) => {
        db.query(
          `UPDATE orders 
          SET status = ?, payment_method = ?, payment_date = NOW()
          WHERE id = ?`,
          ['completed', 'blockchain', payment.order_id],
          (err, results) => {
            if (err) reject(err);
            resolve(results);
          }
        );
      });

      // Log transaction in audit table
      await new Promise((resolve, reject) => {
        db.query(
          `INSERT INTO payment_audit_log 
          (payment_id, tx_hash, block_number, gas_used, gas_price, status, details)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            paymentId,
            receipt.hash,
            receipt.blockNumber,
            receipt.gasUsed.toString(),
            receipt.gasPrice.toString(),
            'success',
            JSON.stringify({
              from: buyerWalletAddress,
              to: sellerWalletAddress,
              amount: payment.amount,
            }),
          ],
          (err, results) => {
            if (err) reject(err);
            resolve(results);
          }
        );
      });

      res.json({
        success: true,
        data: {
          paymentId,
          status: 'completed',
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          message: 'Payment completed successfully',
        },
      });
    } catch (blockchainError) {
      // Log failed transaction
      await updatePaymentStatus(paymentId, 'failed');
      await logPaymentError(paymentId, blockchainError);

      throw new Error(`Blockchain transaction failed: ${blockchainError.message}`);
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error.message,
    });
  }
}

/**
 * Get Payment Status
 * GET /api/payments/:paymentId
 */
export async function getPaymentStatus(req, res) {
  try {
    const { paymentId } = req.params;

    const payment = await new Promise((resolve, reject) => {
      db.query(
        'SELECT * FROM blockchain_payments WHERE payment_id = ?',
        [paymentId],
        (err, results) => {
          if (err) reject(err);
          resolve(results?.[0]);
        }
      );
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.payment_id,
        orderId: payment.order_id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        transactionHash: payment.tx_hash,
        blockNumber: payment.block_number,
        createdAt: payment.created_at,
        confirmedAt: payment.confirmed_at,
      },
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status',
      error: error.message,
    });
  }
}

/**
 * Verify Transaction on Blockchain
 * GET /api/payments/verify/:txHash
 */
export async function verifyTransaction(req, res) {
  try {
    const { txHash } = req.params;

    if (!txHash) {
      return res.status(400).json({
        success: false,
        message: 'Transaction hash required',
      });
    }

    const provider = getProvider();
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return res.json({
        success: true,
        data: {
          verified: false,
          status: 'pending',
          message: 'Transaction pending confirmation',
        },
      });
    }

    const isSuccess = receipt.status === 1;

    res.json({
      success: true,
      data: {
        verified: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: isSuccess ? 'confirmed' : 'failed',
        confirmations: (await provider.getBlockNumber()) - receipt.blockNumber,
      },
    });
  } catch (error) {
    console.error('Error verifying transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify transaction',
      error: error.message,
    });
  }
}

/**
 * Refund Payment
 * POST /api/payments/refund
 */
export async function refundPayment(req, res) {
  try {
    const { paymentId, reason } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID required',
      });
    }

    // Get payment record
    const payment = await new Promise((resolve, reject) => {
      db.query(
        'SELECT * FROM blockchain_payments WHERE payment_id = ? AND status = ?',
        [paymentId, 'completed'],
        (err, results) => {
          if (err) reject(err);
          resolve(results?.[0]);
        }
      );
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or not eligible for refund',
      });
    }

    try {
      // Initialize wallet for refund
      const wallet = getWallet();
      const contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        CONTRACT_ABI,
        wallet
      );

      const amountInWei = ethers.parseUnits(payment.amount.toString(), 6);

      // Execute refund transaction (reverse direction)
      const tx = await contract.transfer(payment.buyer_id, amountInWei);
      const receipt = await tx.wait();

      // Update payment status
      await new Promise((resolve, reject) => {
        db.query(
          `UPDATE blockchain_payments 
          SET status = ?, refund_tx_hash = ?, refund_reason = ?, refunded_at = NOW()
          WHERE payment_id = ?`,
          ['refunded', receipt.hash, reason || 'Manual refund', paymentId],
          (err, results) => {
            if (err) reject(err);
            resolve(results);
          }
        );
      });

      res.json({
        success: true,
        data: {
          paymentId,
          status: 'refunded',
          refundTransactionHash: receipt.hash,
          message: 'Refund processed successfully',
        },
      });
    } catch (blockchainError) {
      throw new Error(`Refund transaction failed: ${blockchainError.message}`);
    }
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message,
    });
  }
}

/**
 * Get Wallet Balance
 * GET /api/payments/wallet/balance/:address
 */
export async function getWalletBalance(req, res) {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address required',
      });
    }

    const provider = getProvider();
    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);

    res.json({
      success: true,
      data: {
        address,
        balance: balanceInEth,
        balanceInWei: balance.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance',
      error: error.message,
    });
  }
}

/**
 * Get Gas Estimate
 * POST /api/payments/estimate-gas
 */
export async function estimateGas(req, res) {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount required',
      });
    }

    const provider = getProvider();
    const wallet = getWallet();
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      wallet
    );

    const amountInWei = ethers.parseUnits(amount.toString(), 6);

    // Estimate gas for transfer
    const gasEstimate = await contract.transfer.estimateGas(
      wallet.address,
      amountInWei
    );

    // Get current gas price
    const gasPrice = await provider.getGasPrice();
    const estimatedCost = gasEstimate * gasPrice;
    const estimatedCostInEth = ethers.formatEther(estimatedCost);

    res.json({
      success: true,
      data: {
        gasEstimate: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
        estimatedCostInEth,
        estimatedCostInWei: estimatedCost.toString(),
      },
    });
  } catch (error) {
    console.error('Error estimating gas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to estimate gas',
      error: error.message,
    });
  }
}

// Helper functions
async function updatePaymentStatus(paymentId, status) {
  return new Promise((resolve, reject) => {
    db.query(
      'UPDATE blockchain_payments SET status = ? WHERE payment_id = ?',
      [status, paymentId],
      (err, results) => {
        if (err) reject(err);
        resolve(results);
      }
    );
  });
}

async function logPaymentError(paymentId, error) {
  return new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO payment_audit_log 
      (payment_id, status, details)
      VALUES (?, ?, ?)`,
      [paymentId, 'error', JSON.stringify({ error: error.message })],
      (err, results) => {
        if (err) reject(err);
        resolve(results);
      }
    );
  });
}

export default {
  initializePayment,
  processPayment,
  getPaymentStatus,
  verifyTransaction,
  refundPayment,
  getWalletBalance,
  estimateGas,
};
