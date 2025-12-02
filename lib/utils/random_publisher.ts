import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createWalletClient, createPublicClient, http, Chain, Hex, toHex } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import 'dotenv/config';

// Define Somnia Testnet
const somniaTestnet: Chain = {
    id: 50312,
    name: 'Somnia Testnet',
    nativeCurrency: { decimals: 18, name: 'STT', symbol: 'STT' },
    rpcUrls: { default: { http: ['https://dream-rpc.somnia.network'] } },
    testnet: true,
};

async function main() {
    try {
        console.log('Initializing...');

        // 1. Setup Wallet
        const privateKey = process.env.NEXT_PRIVATE_KEY_SOMNIA as `0x${string}`;
        if (!privateKey) {
            throw new Error('PRIVATE_KEY_SOMNIA is not defined in .env file');
        }

        const account = privateKeyToAccount(privateKey);
        console.log('Using Wallet:', account.address);

        const walletClient = createWalletClient({
            account,
            chain: somniaTestnet,
            transport: http()
        });

        const publicClient = createPublicClient({
            chain: somniaTestnet,
            transport: http()
        });

        // 2. Initialize SDK
        const sdk = new SDK({ wallet: walletClient, public: publicClient });

        // 3. Define Schema
        // const schema = "string firstname, string lastname";
        const schema = "string name";
        const encoder = new SchemaEncoder(schema);

        // 4. Generate Random Data
        const firstNames = ["Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Heidi"];
        const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];

        const randomFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
        const randomLast = lastNames[Math.floor(Math.random() * lastNames.length)];

        const dataObject = {
            name: randomFirst,
        };
        // const dataObject = {
        //     firstname: randomFirst,
        //     lastname: randomLast
        // };

        console.log('--------------------------------');
        console.log('Generated Data:', dataObject);
        console.log('--------------------------------');

        // 5. Encode Data
        const dataToEncode = [
            { name: 'name', type: 'string', value: randomFirst },
        ];
        // const dataToEncode = [
        //     { name: 'firstname', type: 'string', value: randomFirst },
        //     { name: 'lastname', type: 'string', value: randomLast }
        // ];
        const encodedData = encoder.encodeData(dataToEncode) as Hex;

        // 6. Compute Schema ID
        const schemaId = await sdk.streams.computeSchemaId(schema);
        console.log('Schema ID:', schemaId);

        // 8. Publish Data
        console.log('Publishing data...');
        const timestamp = Date.now();
        // Generate a random 32-byte hex ID
        const dataId = toHex(`random-${timestamp}`, { size: 32 });

        // Note: Using a random wallet with no funds will fail on mainnet/testnet if gas is required.
        // Somnia Testnet usually requires gas. 
        // If this fails due to "insufficient funds", the user needs to provide a funded private key.

        const tx = await sdk.streams.set([{
            id: dataId,
            schemaId: schemaId as `0x${string}`,
            data: encodedData
        }]);

        console.log('Success! Transaction Hash:', tx);

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.message && error.message.includes('insufficient funds')) {
            console.error('\nNOTE: The random wallet generated has 0 STT. Please edit the script to use a funded private key.');
        }
    }
}

main();
