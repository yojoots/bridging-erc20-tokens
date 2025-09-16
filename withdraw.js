import { createPublicClient, createWalletClient, http, formatEther, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, baseSepolia } from 'viem/chains';
import { withdrawOptimismERC20 } from '@eth-optimism/viem/actions';
import dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const L1_RPC_URL = process.env.L1_RPC_URL;
const L2_RPC_URL = process.env.L2_RPC_URL || 'https://sepolia.base.org';

// Token addresses
const L1_TOKEN = process.env.L1_ERC20_ADDRESS;
const L2_TOKEN = process.env.L2_ERC20_ADDRESS; // ERC20 token deployed on Base

// ERC20 ABI
const erc20ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
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

  console.log(`🔄 Starting withdrawal of ${amountInTokens} tokens from Base Sepolia to Sepolia`);

  // Setup clients
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`📝 Using account: ${account.address}`);

  const publicClientL1 = createPublicClient({
    chain: sepolia,
    transport: http(L1_RPC_URL),
  });

  const publicClientL2 = createPublicClient({
    chain: baseSepolia,
    transport: http(L2_RPC_URL),
  });

  const walletClientL2 = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(L2_RPC_URL),
  });

  try {
    // Check L2 balance
    console.log('\n📊 Checking balances...');
    const l2Balance = await publicClientL2.readContract({
      address: L2_TOKEN,
      abi: erc20ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });
    console.log(`L2 Balance: ${formatEther(l2Balance)} tokens`);

    if (l2Balance < amount) {
      console.error(`❌ Insufficient L2 balance. Need ${formatEther(amount)}, have ${formatEther(l2Balance)}`);
      process.exit(1);
    }

    // Withdraw tokens
    console.log('\n🔄 Initiating withdrawal...');
    const withdrawTx = await withdrawOptimismERC20(walletClientL2, {
      tokenAddress: L2_TOKEN,
      remoteTokenAddress: L1_TOKEN,
      amount: amount,
      targetChain: sepolia,
      to: account.address,
      minGasLimit: 200000,
    });

    console.log(`Withdrawal tx: ${withdrawTx}`);

    // Wait for withdrawal confirmation
    const withdrawReceipt = await publicClientL2.waitForTransactionReceipt({
      hash: withdrawTx
    });
    console.log(`✅ Withdrawal initiated in block ${withdrawReceipt.blockNumber}`);

    // Check L2 balance after withdrawal
    console.log('\n📊 Updated L2 balance:');
    const l2BalanceAfter = await publicClientL2.readContract({
      address: L2_TOKEN,
      abi: erc20ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });
    console.log(`L2 Balance: ${formatEther(l2BalanceAfter)} tokens`);

    // Important note about withdrawal timing
    console.log('\n⚠️  IMPORTANT: Withdrawal Process');
    console.log('📝 Your withdrawal has been initiated, but it will take time to complete:');
    console.log('   • Base Sepolia: ~1 week challenge period');
    console.log('   • After the challenge period, you need to finalize the withdrawal on L1');
    console.log('   • Your L1 balance will only update after finalization');
    console.log('\n💡 Monitor your withdrawal status on the Base bridge UI or wait for the challenge period to end.');
  } catch (error) {
    console.error('❌ Error during withdrawal:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);