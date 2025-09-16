import { createPublicClient, createWalletClient, http, formatEther, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, baseSepolia } from 'viem/chains';
import { depositERC20 } from '@eth-optimism/viem/actions';
import dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const L1_RPC_URL = process.env.L1_RPC_URL;
const L2_RPC_URL = process.env.L2_RPC_URL || 'https://sepolia.base.org';

// Token addresses
const L1_TOKEN = process.env.L1_ERC20_ADDRESS; // address of the deployed ERC20 token on Ethereum (Sepolia)
const L2_TOKEN = process.env.L2_ERC20_ADDRESS; // address of the deployed ERC20 token on Base

// ERC20 ABI (minimal)
const erc20ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "faucet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  }
];

async function main() {
  if (!PRIVATE_KEY) {
    console.error('Please set PRIVATE_KEY environment variable');
    process.exit(1);
  }

  // Get amount from command line argument (defaults to 1 token)
  const amountInTokens = process.argv[2] ? parseFloat(process.argv[2]) : 1;
  const amount = parseEther(amountInTokens.toString());

  console.log(`🚀 Starting bridge deposit of ${amountInTokens} tokens from Sepolia to Base Sepolia`);

  // Setup clients
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`📝 Using account: ${account.address}`);

  const publicClientL1 = createPublicClient({
    chain: sepolia,
    transport: http(L1_RPC_URL),
  });

  const walletClientL1 = createWalletClient({
    account,
    chain: sepolia,
    transport: http(L1_RPC_URL),
  });

  const publicClientL2 = createPublicClient({
    chain: baseSepolia,
    transport: http(L2_RPC_URL),
  });

  try {
    // Check L1 balance
    console.log('\n📊 Checking balances...');
    const l1Balance = await publicClientL1.readContract({
      address: L1_TOKEN,
      abi: erc20ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });
    console.log(`L1 Balance: ${formatEther(l1Balance)} tokens`);

    if (l1Balance < amount) {
      console.error(`❌ Insufficient L1 balance. Need ${formatEther(amount)}, have ${formatEther(l1Balance)}`);
      console.log('💡 You can get tokens from the faucet by running: node faucet.js');
      process.exit(1);
    }

    // Get bridge address
    const bridgeAddress = baseSepolia.contracts.l1StandardBridge[sepolia.id].address;
    console.log(`🌉 Using bridge address: ${bridgeAddress}`);

    // Approve tokens
    console.log('\n✅ Approving tokens...');
    const approveTx = await walletClientL1.writeContract({
      address: L1_TOKEN,
      abi: erc20ABI,
      functionName: 'approve',
      args: [bridgeAddress, amount],
    });
    console.log(`Approval tx: ${approveTx}`);

    // Wait for approval
    await publicClientL1.waitForTransactionReceipt({ hash: approveTx });
    console.log('✅ Approval confirmed');

    // Deposit tokens
    console.log('\n🚀 Depositing tokens to L2...');
    const depositTx = await depositERC20(walletClientL1, {
      tokenAddress: L1_TOKEN,
      remoteTokenAddress: L2_TOKEN,
      amount: amount,
      targetChain: baseSepolia,
      to: account.address,
      minGasLimit: 200000,
    });

    console.log(`Deposit tx: ${depositTx}`);

    // Wait for deposit confirmation
    const depositReceipt = await publicClientL1.waitForTransactionReceipt({
      hash: depositTx
    });
    console.log(`✅ Deposit confirmed in block ${depositReceipt.blockNumber}`);

    // Check final balances
    console.log('\n📊 Final balances:');
    const l1BalanceAfter = await publicClientL1.readContract({
      address: L1_TOKEN,
      abi: erc20ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });
    console.log(`L1 Balance: ${formatEther(l1BalanceAfter)} tokens`);

    // Note: L2 balance might take a few minutes to update due to challenge period
    console.log('\n⏳ L2 balance will update after the transaction is processed (usually 1-2 minutes)');
    console.log('💡 You can check L2 balance by running: node check-balance.js');
  } catch (error) {
    console.error('❌ Error during deposit:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);