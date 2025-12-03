import { SDK } from '@somnia-chain/streams';
import { createPublicClient, http, defineChain } from 'viem';
import 'dotenv/config';

// Define Somnia Testnet
const somniaTestnet = defineChain({
    id: 50312,
    name: 'Somnia Testnet',
    network: 'somnia-testnet',
    nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://dream-rpc.somnia.network'] },
    },
    testnet: true,
});

async function main() {
    const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http()
    });

    const sdk = new SDK({
        public: publicClient as any, // Cast to avoid strict type mismatch if any
    });

    const parentId = "0xf4fc59e9892f3d2919b9524981a183232530d27fd89a026b9a941d9f2da7d508" as `0x${string}`;
    const schemaName = "internationalghostschema";
    const schemaString = "uint64 timestamp, string ghostname";

    console.log(`Inspecting Parent Schema: ${parentId}`);

    // 1. Check if parent exists
    try {
        const isParentRegistered = await sdk.streams.isDataSchemaRegistered(parentId);
        console.log(`Is Parent Registered? ${isParentRegistered}`);

        if (isParentRegistered) {
            const parentName = await sdk.streams.schemaIdToSchemaName(parentId);
            console.log(`Parent Name: ${parentName}`);
        }
    } catch (e) {
        console.log("Error checking parent:", e);
    }

    // 2. Compute ID for the new schema
    try {
        const computedId = await sdk.streams.computeSchemaId(schemaString);
        console.log(`Computed ID for new schema: ${computedId}`);

        if (computedId) {
            const isRegistered = await sdk.streams.isDataSchemaRegistered(computedId as `0x${string}`);
            console.log(`Is new schema ID already registered? ${isRegistered}`);
            if (isRegistered) {
                const existingName = await sdk.streams.schemaIdToSchemaName(computedId as `0x${string}`);
                console.log(`Existing Name for this schema string: ${existingName}`);
            }
        }
    } catch (e) {
        console.log("Error computing new ID:", e);
    }
}

main();
