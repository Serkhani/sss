'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStream } from '../providers/StreamProvider';
import { parseSchemaString, SchemaField } from '@/lib/utils/schemaParser';
import { generateRandomData } from '@/lib/utils/randomizer';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { SchemaEncoder, SDK as Somnia } from '@somnia-chain/streams';
import { Zap, Activity, StopCircle, BookOpen } from 'lucide-react';
import { useToast } from '../providers/ToastProvider';
import { toHex, Hex, createWalletClient, createPublicClient, http, Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Define Somnia Testnet Chain (Duplicated from StreamProvider for now, or export it)
const somniaTestnet: Chain = {
    id: 50312,
    name: 'Somnia Testnet',
    nativeCurrency: { decimals: 18, name: 'STT', symbol: 'STT' },
    rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL_SOMNIA || 'https://dream-rpc.somnia.network'] } },
    testnet: true,
};

export default function TrafficSimulator() {
    const { sdk, isConnected } = useStream();
    const [schemaString, setSchemaString] = useState('');
    const [isChaosMode, setIsChaosMode] = useState(false);
    const [packetCount, setPacketCount] = useState(0);
    const [lastPacketTime, setLastPacketTime] = useState<number | null>(null);
    const [simulateData, setSimulateData] = useState(true);
    const [simulateEvents, setSimulateEvents] = useState(false);
    const [lastSentData, setLastSentData] = useState<any>(null);
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

        if (!simulateData && !simulateEvents) {
            toast.error('Please select at least one simulation type (Data or Events).');
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

        const fields = parseSchemaString(schemaString);
        const encoder = new SchemaEncoder(schemaString);

        // Pre-compute schema ID and register if needed
        let schemaId: `0x${string}` | undefined;
        try {
            // Use the main SDK for reading/computing initially
            const computedId = await sdk!.streams.computeSchemaId(schemaString);
            if (computedId instanceof Error) throw computedId;
            schemaId = computedId;

            // Register Data Schema if enabled
            if (simulateData) {
                await sdk!.streams.registerDataSchemas([{
                    schemaName: `chaos-${Date.now()}`,
                    schema: schemaString,
                    parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000'
                }], true);
            }

            // Register Event Schema if enabled
            if (simulateEvents) {
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
            }

        } catch (e) {
            toast.info('Registration warning: Schema/Event might be already registered');
        }

        if (simulateData && !schemaId) {
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

                let dataStreams: any[] = [];
                let eventStreams: any[] = [];

                if (simulateData && schemaId) {
                    const idVal = BigInt(Date.now());
                    const dataId = toHex(`chaos-${idVal}`, { size: 32 });
                    dataStreams.push({
                        id: dataId,
                        schemaId: schemaId as `0x${string}`,
                        data: encodedData
                    });
                }

                if (simulateEvents) {
                    eventStreams.push({
                        id: 'ChaosEvent',
                        argumentTopics: [],
                        data: encodedData
                    });
                }

                // Update display state
                setLastSentData({
                    timestamp: Date.now(),
                    decodedData: data,
                    dataStreams: dataStreams.map(ds => ({ ...ds, data: '0x...' })), // Truncate hex for display
                    eventStreams: eventStreams.map(es => ({ ...es, data: '0x...' }))
                });

                // Publish
                if (chaosAccount) {
                    const wc = createWalletClient({
                        account: chaosAccount,
                        chain: somniaTestnet,
                        transport: http()
                    });

                    const pc = createPublicClient({ chain: somniaTestnet, transport: http() });
                    const tempSdk = new Somnia({ public: pc, wallet: wc });

                    if (simulateData && simulateEvents) {
                        await tempSdk.streams.setAndEmitEvents(dataStreams, eventStreams);
                    } else if (simulateData) {
                        await tempSdk.streams.set(dataStreams);
                    } else if (simulateEvents) {
                        await tempSdk.streams.emitEvents(eventStreams);
                    }
                } else {
                    if (simulateData && simulateEvents) {
                        await sdk!.streams.setAndEmitEvents(dataStreams, eventStreams);
                    } else if (simulateData) {
                        await sdk!.streams.set(dataStreams);
                    } else if (simulateEvents) {
                        await sdk!.streams.emitEvents(eventStreams);
                    }
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
                    <a
                        href="https://docs.somnia.network/somnia-data-streams/getting-started/quickstart"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-white transition-colors ml-2"
                        title="View Documentation"
                    >
                        <BookOpen className="h-4 w-4" />
                    </a>
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

                <div className="flex flex-col sm:flex-row sm:gap-6 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={simulateData}
                            onChange={(e) => setSimulateData(e.target.checked)}
                            disabled={isChaosMode}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50"
                        />
                        <span className="text-sm text-slate-300">Simulate Data Stream</span>
                    </label>
                    {/* <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={simulateEvents}
                            onChange={(e) => setSimulateEvents(e.target.checked)}
                            disabled={isChaosMode}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50"
                        />
                        <span className="text-sm text-slate-300">Simulate Event Emission</span>
                    </label> */}
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

            {lastSentData && (
                <div className="mt-4 p-4 rounded-lg bg-black/40 border border-slate-800 font-mono text-xs text-slate-300 overflow-hidden">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-400">Last Sent Data</span>
                        <span className="text-slate-600">{new Date(lastSentData.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <pre className="overflow-x-auto">
                        {JSON.stringify(lastSentData, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
