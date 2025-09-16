# ERC20 Token Bridging

Scripts for bridging ERC20 tokens between Ethereum Sepolia and Base Sepolia networks. Based off the [Bridging ERC-20 tokens with viem](https://docs.optimism.io/app-developers/tutorials/bridging/cross-dom-bridge-erc20) tutorial.

## Features

- 💰 **Balance Check**: Check token balances on both L1 and L2
- ⬇️ **Deposit**: Bridge tokens from L1 (Ethereum Sepolia) to L2 (Base Sepolia)
- ⬆️ **Withdraw**: Bridge tokens from L2 (Base Sepolia) to L1 (Ethereum Sepolia)

## Prerequisites

- Node.js (v16 or higher)
- pnpm package manager
- Ethereum wallet with private key
- Access to Ethereum Sepolia and Base Sepolia testnets

## Setup

Before running any of these scripts, you must make sure the ERC20 token is deployed to the Base network you're interested in (either Base mainnet or Base Sepolia testnet).

### Deploying to Base

There is a full [Bridging Your Standard ERC-20 Token Using the Standard Bridge](https://docs.optimism.io/app-developers/tutorials/bridging/standard-bridge-standard-token) tutorial for setting up a standard-bridgeable Base ERC20 token. The steps are:

1. **Install foundry (`cast`):**

    First, make sure [foundry is installed](https://getfoundry.sh/introduction/installation/) so you can call `cast`:

    ```bash
    cast --version
    ```

2. **Export env vars:**

    Set up env vars for the address you're deploying with (it must have funds on the L1 network you're interested in; you can bridge funds over with [Superbridge](https://superbridge.app/base), for instance). The example below targets Base Sepolia and uses [the DSTRX token at `0x7fE840B30f32BC0DC977960637Aa9Be8a74660F3` on Sepolia](https://sepolia.etherscan.io/address/0x7fE840B30f32BC0DC977960637Aa9Be8a74660F3) as the L1 token address:

    ```bash
    export DEPLOYER_PRIVATE_KEY=0x...
    export DEPLOYER_RPC_URL=https://sepolia.base.org
    export DEPLOYER_L1_ERC20_ADDRESS=0x7fE840B30f32BC0DC977960637Aa9Be8a74660F3
    ```

3. **Deploy L2 Token:**

    Deploy the Base ERC20 contract with `cast`:

    ```bash
    cast send 0x4200000000000000000000000000000000000012 "createOptimismMintableERC20(address,string,string)" $DEPLOYER_L1_ERC20_ADDRESS "Districts Token" "DSTRX" --private-key $DEPLOYER_PRIVATE_KEY --rpc-url $DEPLOYER_RPC_URL --json | jq -r '.logs[0].topics[2]' | cast parse-bytes32-address
    ```

    The output of the `cast` command should be the newly-deployed token address on the Base network you were targeting via the `DEPLOYER_RPC_URL`. You can check it out on [the BaseScan explorer](https://sepolia.basescan.org/address/0xef26585cEbd199B34EDF2c9B415a5f74B8259B88#readContract) to make sure everything is as expected.

### Script Setup

After an ERC20 token is deployed to the Base network you're interested in, you can run the scripts in this repo for balance-checking,depositing (bridging in) to, and withdrawing (bridging out) from your Base token using the Standard Bridge.

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Install dotenv (if not already installed):**

   ```bash
   pnpm add dotenv
   ```

3. **Create environment file:**

   Create a `.env` file in the project root with your environment variables (copy the format of `.env.example`):

   ```env
   PRIVATE_KEY=your_private_key_here
   # Add other required environment variables as needed
   ```

4. **Fund account(s):**

   Make sure that the address corresponding to your `PRIVATE_KEY` env var has sufficient funds to deploy with (see [this transaction](https://sepolia.basescan.org/tx/0x1b08a802ca71b053dd236bc9126501a15aead8739b56e0b19845397135bbe722) for an idea of what the deployment tx fees might be in practice)

## Usage

### Check Token Balances

Check your token balances on both networks:

```bash
npm run balance
# or directly:
node check-balance.js
```

### Bridge Tokens L1 → L2 (Deposit)

Bridge tokens from Ethereum Sepolia to Base Sepolia:

```bash
# Use default amount
npm run deposit

# Or specify custom amount
node deposit.js 2.5
```

### Bridge Tokens L2 → L1 (Withdraw)

Bridge tokens from Base Sepolia to Ethereum Sepolia:

```bash
# Use default amount
npm run withdraw

# Or specify custom amount
node withdraw.js 1.5
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `balance` | `npm run balance` | Check token balances on both networks |
| `deposit` | `npm run deposit` | Bridge tokens L1 → L2 |
| `withdraw` | `npm run withdraw` | Bridge tokens L2 → L1 |

## Dependencies

- `@eth-optimism/viem`: Optimism-specific utilities for Viem
- `viem`: TypeScript interface for Ethereum
- `dotenv`: Environment variable management

## Networks

- **L1**: Ethereum Sepolia Testnet
- **L2**: Base Sepolia Testnet
