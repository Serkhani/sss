import 'dotenv/config'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { SDK } from '@somnia-chain/streams'
import { somniaTestnet, sepolia } from './chain'

function getEnv(key: string): string {
    const value = process.env[key]
    if (!value) {
        console.warn(`Missing environment variable: ${key}. Some features may not work.`)
        return ''
    }
    return value
}

// === Client 1: Somnia SDK (Read/Write) ===
// Only initialize wallet client if private key is present
const privateKey = process.env.PRIVATE_KEY_SOMNIA as `0x${string}` | undefined;
const account = privateKey ? privateKeyToAccount(privateKey) : undefined;

const somniaWalletClient = account ? createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL_SOMNIA || 'https://dream-rpc.somnia.network'),
}) : undefined;

const somniaPublicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL_SOMNIA || 'https://dream-rpc.somnia.network'),
})

export const somniaSdk = new SDK({
    public: somniaPublicClient,
    wallet: somniaWalletClient,
})

// === Client 2: Sepolia Public Client (Read-Only) ===
export const sepoliaPublicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.NEXT_PUBLIC_DEFAULT_SEPOLIA_RPC_URL || 'https://sepolia.drpc.org'),
})
