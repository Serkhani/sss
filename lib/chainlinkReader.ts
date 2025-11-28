import { parseAbi, Address } from 'viem'
import { sepoliaPublicClient } from './clients'

// Chainlink ETH/USD Feed on Sepolia Testnet
const CHAINLINK_FEED_ADDRESS: Address = '0x694AA1769357215DE4FAC081bf1f309aDC325306'

// Minimal ABI for AggregatorV3Interface
const CHAINLINK_ABI = parseAbi([
    'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
    'function decimals() external view returns (uint8)',
])

export interface PriceData {
    roundId: bigint
    price: bigint
    timestamp: bigint
    decimals: number
}

/**
 * Fetches the latest price data from the Chainlink ETH/USD feed on Sepolia.
 */
export async function fetchLatestPrice(): Promise<PriceData> {
    console.log('Fetching latest price from Chainlink on Sepolia...')

    try {
        const [roundData, decimals] = await Promise.all([
            sepoliaPublicClient.readContract({
                address: CHAINLINK_FEED_ADDRESS,
                abi: CHAINLINK_ABI,
                functionName: 'latestRoundData',
            }),
            sepoliaPublicClient.readContract({
                address: CHAINLINK_FEED_ADDRESS,
                abi: CHAINLINK_ABI,
                functionName: 'decimals',
            })
        ])

        const [roundId, answer, , updatedAt] = roundData

        console.log(`Chainlink data received: Round ${roundId}, Price ${answer}`)

        return {
            roundId,
            price: answer,
            timestamp: updatedAt,
            decimals,
        }
    } catch (error: any) {
        console.error(`Failed to read from Chainlink: ${error.message}`)
        throw error
    }
}
