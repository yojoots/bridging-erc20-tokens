import { createPublicClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, baseSepolia } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const L1_RPC_URL = process.env.L1_RPC_URL;
const L2_RPC_URL = process.env.L2_RPC_URL || 'https://sepolia.base.org';
const L1_TOKEN = process.env.L1_ERC20_ADDRESS;
const L2_TOKEN = process.env.L2_ERC20_ADDRESS;

const erc20ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  }
];

async function main() {
  if (!PRIVATE_KEY) {
    console.error('Please set PRIVATE_KEY environment variable');
    process.exit(1);
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`📊 Checking balances for: ${account.address}`);

  const publicClientL1 = createPublicClient({
    chain: sepolia,
    transport: http(L1_RPC_URL),
  });

  const publicClientL2 = createPublicClient({
    chain: baseSepolia,
    transport: http(L2_RPC_URL),
  });

  try {
    // Check L1 balance
    const l1Balance = await publicClientL1.readContract({
      address: L1_TOKEN,
      abi: erc20ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });

    // Check L2 balance
    const l2Balance = await publicClientL2.readContract({
      address: L2_TOKEN,
      abi: erc20ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });

    console.log('\n📊 Current Balances:');
    console.log(`L1 (Sepolia): ${formatEther(l1Balance)} DSTRX`);
    console.log(`L2 (Base Sepolia): ${formatEther(l2Balance)} DSTRX`);

  } catch (error) {
    console.error('❌ Error checking balances:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);