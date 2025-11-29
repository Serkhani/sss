import { defineChain } from 'viem'
import { sepolia as sepoliaBase } from 'viem/chains'

// 1. Somnia Testnet
export const somniaTestnet = defineChain({
    id: 50312,
    name: 'Somnia Testnet',
    network: 'somnia-testnet',
    nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
    rpcUrls: {
        default: { http: [process.env.NEXT_PUBLIC_RPC_URL_SOMNIA || 'https://dream-rpc.somnia.network'] },
        public: { http: [process.env.NEXT_PUBLIC_RPC_URL_SOMNIA || 'https://dream-rpc.somnia.network'] },
    },
} as const)

// 2. Sepolia Testnet (for Chainlink)
export const sepolia = sepoliaBase
