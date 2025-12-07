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

    // Multi-Wallet Support
    const [wallets, setWallets] = useState<{ pk: string, address: string }[]>([]);
    const [newPrivateKey, setNewPrivateKey] = useState('');

    const addWallet = () => {
        try {
            if (!newPrivateKey.startsWith('0x') || newPrivateKey.length !== 66) {
                toast.error('Invalid Private Key (must be 0x... and 66 chars)');
                return;
            }
            const account = privateKeyToAccount(newPrivateKey as Hex);
            if (wallets.some(w => w.address === account.address)) {
                toast.error('Wallet already added');
                return;
            }
            setWallets([...wallets, { pk: newPrivateKey, address: account.address }]);
            setNewPrivateKey('');
            toast.success('Wallet added!');
        } catch (e) {
            toast.error('Invalid Private Key');
        }
    };

    const removeWallet = (index: number) => {
        const newWallets = [...wallets];
        newWallets.splice(index, 1);
        setWallets(newWallets);
    };

    const startChaos = async () => {
        if (!schemaString) {
            toast.error('Please enter a valid schema string.');
            return;
        }

        if (!simulateData && !simulateEvents) {
            toast.error('Please select at least one simulation type (Data or Events).');
            return;
        }

        if (wallets.length === 0 && !isConnected) {
            toast.error('Please connect wallet or add at least one private key.');
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

        let sentCount = 0;

        intervalRef.current = setInterval(async () => {
            try {
                // Select Wallet Round-Robin
                let currentWallet = null;
                if (wallets.length > 0) {
                    currentWallet = wallets[sentCount % wallets.length];
                }

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
                    const dataId = toHex(`chaos-${idVal}-${sentCount}`, { size: 32 });
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
                    sender: currentWallet ? currentWallet.address : 'Browser Wallet',
                    decodedData: data,
                    dataStreams: dataStreams.map(ds => ({ ...ds, data: '0x...' })), // Truncate hex for display
                    eventStreams: eventStreams.map(es => ({ ...es, data: '0x...' }))
                });

                // Publish
                if (currentWallet) {
                    const account = privateKeyToAccount(currentWallet.pk as Hex);
                    const wc = createWalletClient({
                        account,
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
                    // Fallback to browser wallet
                    if (simulateData && simulateEvents) {
                        await sdk!.streams.setAndEmitEvents(dataStreams, eventStreams);
                    } else if (simulateData) {
                        await sdk!.streams.set(dataStreams);
                    } else if (simulateEvents) {
                        await sdk!.streams.emitEvents(eventStreams);
                    }
                }

                setPacketCount(prev => prev + 1);
                sentCount++;
                setLastPacketTime(Date.now());

            } catch (error) {
                console.error("Chaos Error", error);
                // toast.error(`Chaos Error: ${error}`); // Suppress constant toasts
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
                        className="font-mono text-sm"
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

                <div className="space-y-2 p-4 bg-slate-950/30 rounded-lg border border-slate-800">
                    <Label className="flex items-center justify-between">
                        <span>Traffic Sources (Wallets)</span>
                        <span className="text-xs text-slate-500">{wallets.length} Active</span>
                    </Label>

                    <div className="space-y-2">
                        {wallets.map((w, i) => (
                            <div key={i} className="flex items-center justify-between bg-black/40 px-3 py-2 rounded border border-slate-800/50">
                                <span className="font-mono text-xs text-slate-300 truncate w-3/4">{w.address}</span>
                                <button onClick={() => removeWallet(i)} disabled={isChaosMode} className="text-slate-500 hover:text-red-500">
                                    <StopCircle className="w-4 h-4" />
                                    {/* Reusing StopCircle as delete icon or import Trash */}
                                    {/* Let's keep existing imports or add Trash if easily available */}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Input
                            type="password"
                            placeholder="Add Private Key (0x...)"
                            value={newPrivateKey}
                            onChange={(e) => setNewPrivateKey(e.target.value)}
                            disabled={isChaosMode}
                            className="font-mono text-xs flex-1"
                        />
                        <Button onClick={addWallet} disabled={isChaosMode || !newPrivateKey} variant="outline" className="h-9 px-3">
                            Add
                        </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        If no wallets are added, the browser wallet will be used (single source).
                    </p>
                </div>
            </div>

            <div className="pt-4">
                <Button
                    onClick={toggleChaos}
                    disabled={(!isConnected && wallets.length === 0) || !schemaString}
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-1">
                        <span className="font-bold text-slate-400">Last Packet</span>
                        <span className="text-indigo-400 text-[10px] sm:text-xs break-all">{lastSentData.sender}</span>
                        <span className="text-slate-600">{new Date(lastSentData.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <pre className="overflow-x-auto">
                        {JSON.stringify(lastSentData.decodedData, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
