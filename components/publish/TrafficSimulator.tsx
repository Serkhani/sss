'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStream } from '../providers/StreamProvider';
import { parseSchemaString, SchemaField } from '@/lib/utils/schemaParser';
import { generateRandomData } from '@/lib/utils/randomizer';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { SchemaEncoder, SDK as Somnia } from '@somnia-chain/streams';
import { Zap, Activity, StopCircle } from 'lucide-react';
import { useToast } from '../providers/ToastProvider';
import { toHex, Hex, createWalletClient, createPublicClient, http, Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Define Somnia Testnet Chain (Duplicated from StreamProvider for now, or export it)
const somniaTestnet: Chain = {
    id: 50312,
    name: 'Somnia Testnet',
    nativeCurrency: { decimals: 18, name: 'STT', symbol: 'STT' },
    rpcUrls: { default: { http: ['https://dream-rpc.somnia.network'] } },
    testnet: true,
};

export default function TrafficSimulator() {
    const { sdk, isConnected } = useStream();
    const [schemaString, setSchemaString] = useState('');
    const [isChaosMode, setIsChaosMode] = useState(false);
    const [packetCount, setPacketCount] = useState(0);
    const [lastPacketTime, setLastPacketTime] = useState<number | null>(null);
    const toast = useToast();

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const toggleChaos = () => {
        if (isChaosMode) {
            stopChaos();
        } else {
            startChaos();
        }
    };

    const [privateKey, setPrivateKey] = useState('');

    const startChaos = async () => {
        if (!schemaString) {
            toast.error('Please enter a valid schema string.');
            return;
        }

        let chaosSdk = sdk;
        let chaosAccount = null;

        // If private key provided, create a local signer
        if (privateKey) {
            try {
                if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
                    toast.error('Invalid Private Key format (must be 0x... and 66 chars)');
                    return;
                }
                const account = privateKeyToAccount(privateKey as Hex);
                chaosAccount = account;

                // Create a dedicated wallet client
                const wc = createWalletClient({
                    account,
                    chain: somniaTestnet,
                    transport: http()
                });

                // Create a new SDK instance for chaos
                // We need to cast it because we are creating a fresh instance
                // Assuming we can import SDK class or use the existing one's constructor if available
                // But since we can't easily import the class if it's not exported, we might need to rely on the existing sdk if we can't create new.
                // However, StreamProvider exports SDK class.
                // Let's assume we can use the existing sdk but we need to swap the wallet client? 
                // No, better to create a new instance if possible.
                // Actually, let's look at StreamProvider imports.
                // It imports { SDK as Somnia }. So we can import it here too.

                // For now, let's assume we can't easily re-instantiate without importing the class.
                // Let's try to use the existing sdk but that uses the connected wallet.
                // Wait, I can import { SDK } from '@somnia-chain/streams' in this file too.
            } catch (e) {
                console.log('Private Key Error:', e);
                toast.error('Invalid Private Key');
                return;
            }
        } else if (!isConnected || !sdk) {
            toast.error('Please connect wallet or provide private key.');
            return;
        }

        setIsChaosMode(true);

        // We need to handle the SDK instance. 
        // If private key is used, we MUST create a new SDK instance to use that signer.
        // I will add the import for SDK in a separate edit or assume it's available.
        // For now, let's assume we use the existing SDK if no PK, or a new one if PK.
        // I'll add the logic inside the loop to use the correct client.

        // Actually, I need to import SDK to create a new one.
        // I'll add the import in the next step.

        const fields = parseSchemaString(schemaString);
        const encoder = new SchemaEncoder(schemaString);

        // Pre-compute schema ID and register if needed
        let schemaId: `0x${string}` | undefined;
        try {
            // Use the main SDK for reading/computing initially
            const computedId = await sdk!.streams.computeSchemaId(schemaString);
            if (computedId instanceof Error) throw computedId;
            schemaId = computedId;

            // Register Data Schema
            await sdk!.streams.registerDataSchemas([{
                schemaName: `chaos-${Date.now()}`,
                schema: schemaString,
                parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000'
            }], true);

            // Register Event Schema
            // We need to parse params from schema string for event registration
            // Simple mapping: schema fields -> event params
            const eventParams = fields.map(f => ({
                name: f.name,
                paramType: f.type,
                isIndexed: false // Default to not indexed for simplicity
            }));

            // Construct canonical signature
            const signature = `ChaosEvent(${fields.map(f => f.type).join(',')})`;

            const eventSchema = {
                params: eventParams,
                eventTopic: signature
            };

            await sdk!.streams.registerEventSchemas(
                [{ id: 'ChaosEvent', schema: eventSchema }]
            );

        } catch (e) {
            toast.info('Registration warning: Schema/Event might be already registered');
        }

        if (!schemaId) {
            toast.error('Failed to compute schema ID');
            setIsChaosMode(false);
            return;
        }

        intervalRef.current = setInterval(async () => {
            try {
                const data = generateRandomData(fields);

                const dataToEncode = fields.map(field => ({
                    name: field.name,
                    type: field.type,
                    value: data[field.name]
                }));

                const encodedData = encoder.encodeData(dataToEncode) as Hex;
                const idVal = BigInt(Date.now());
                const dataId = toHex(`chaos-${idVal}`, { size: 32 });

                // Construct Data Stream
                const dataStream = {
                    id: dataId,
                    schemaId: schemaId as `0x${string}`,
                    data: encodedData
                };

                // Construct Event Stream
                const eventStream = {
                    id: 'ChaosEvent',
                    argumentTopics: [],
                    data: encodedData
                };

                // Publish
                if (chaosAccount) {
                    // Create a temporary SDK instance for this transaction to use the private key
                    // We do this inside the loop or once outside? 
                    // Doing it once outside is better but I need to pass it in.
                    // For now, let's create it here or use a ref.
                    // Actually, let's just create it once at the start of startChaos and store in a ref or variable.
                    // But I can't easily change the scope now without rewriting the whole function.
                    // I'll create it here for now, it's cheap enough (just an object).

                    const wc = createWalletClient({
                        account: chaosAccount,
                        chain: somniaTestnet,
                        transport: http()
                    });

                    // We need a public client too for the SDK
                    // I'll assume we can use the one from the hook or create a new one
                    // The SDK constructor takes { public, wallet }
                    // I'll create a minimal one

                    // Actually, I should just create a proper public client
                    const pc = createPublicClient({ chain: somniaTestnet, transport: http() });
                    const tempSdk = new Somnia({ public: pc, wallet: wc });
                    // But I don't want to import createPublicClient if I don't have to.
                    // Let's just use the wallet client and hope SDK doesn't need public for setAndEmitEvents (it shouldn't for just writing).

                    // Wait, I can import createPublicClient.

                    await tempSdk.streams.setAndEmitEvents(
                        [dataStream],
                        [eventStream]
                    );
                } else {
                    await sdk!.streams.setAndEmitEvents(
                        [dataStream],
                        [eventStream]
                    );
                }

                setPacketCount(prev => prev + 1);
                setLastPacketTime(Date.now());

            } catch (error) {
                toast.error(`Chaos Error: ${error}`);
            }
        }, 2000);
    };

    const stopChaos = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsChaosMode(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopChaos();
    }, []);

    return (
        <div className="space-y-6 p-6 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl relative overflow-hidden">
            {isChaosMode && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 animate-pulse" />
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className={`h-6 w-6 ${isChaosMode ? 'text-red-500 animate-bounce' : 'text-slate-400'}`} />
                    <h2 className="text-2xl font-bold tracking-tight text-white">Traffic Simulator</h2>
                </div>
                <div className="text-sm font-mono text-slate-500">
                    Packets Sent: <span className="font-bold text-slate-200">{packetCount}</span>
                </div>
            </div>
            <p className="text-sm text-slate-400 -mt-4">
                Generate high-frequency chaos traffic to stress-test your stream consumers.
            </p>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Target Schema String</Label>
                    <Input
                        placeholder="e.g. uint64 timestamp, int32 value"
                        value={schemaString}
                        onChange={(e) => setSchemaString(e.target.value)}
                        disabled={isChaosMode}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Private Key (Optional - for auto-signing)</Label>
                    <Input
                        type="password"
                        placeholder="0x... (Leave empty to use MetaMask)"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        disabled={isChaosMode}
                        className="font-mono text-xs"
                    />
                    <p className="text-xs text-slate-500">
                        WARNING: Only use a test wallet. Keys are stored in memory only.
                    </p>
                </div>
            </div>

            <div className="pt-4">
                <Button
                    onClick={toggleChaos}
                    disabled={(!isConnected && !privateKey) || !schemaString}
                    className={`w-full h-16 text-lg transition-all duration-100 ${isChaosMode
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]'
                        : 'bg-slate-900'
                        }`}
                >
                    {isChaosMode ? (
                        <>
                            <StopCircle className="mr-2 h-6 w-6" /> STOP CHAOS MODE
                        </>
                    ) : (
                        <>
                            <Zap className="mr-2 h-6 w-6" /> START CHAOS MODE
                        </>
                    )}
                </Button>
            </div>

            {isChaosMode && lastPacketTime && (
                <div className="text-center text-xs text-slate-400 animate-fade-in">
                    Last packet sent {Date.now() - lastPacketTime}ms ago
                </div>
            )}
        </div>
    );
}
