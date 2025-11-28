'use client';

import React, { useState, useEffect } from 'react';
import { useStream } from '../providers/StreamProvider';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { createPublicClient, http, parseAbi, formatUnits, toHex, Hex, Abi, AbiFunction } from 'viem';
import { mainnet } from 'viem/chains'; // Default chain, but we use custom transport
import { SchemaEncoder } from '@somnia-chain/streams';
import { Activity, RefreshCw, Save, History, Settings, ArrowRight, Code, Play } from 'lucide-react';

// Defaults (Chainlink ETH/USD on Sepolia)
const priceFeedSchema =
    'uint64 timestamp, int256 price, uint80 roundId, string pair';
const DEFAULT_TARGET_ADDRESS = '0x694AA1769357215DE4FAC081bf1f309aDC325306';
const DEFAULT_RPC_URL = 'https://sepolia.drpc.org';
const DEFAULT_ABI_INPUT = `function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
function decimals() external view returns (uint8)`;

interface HistoryItem {
    timestamp: number;
    price: string;
    roundId: string;
    pair: string;
}

interface ParsedFunction {
    name: string;
    inputs: { name?: string; type: string }[];
    outputs: { name?: string; type: string }[];
    signature: string;
}

export default function UniversalBot() {
    const { sdk, isConnected, address } = useStream();

    // Configuration State
    const [targetAddress, setTargetAddress] = useState(DEFAULT_TARGET_ADDRESS);
    const [rpcUrl, setRpcUrl] = useState(DEFAULT_RPC_URL);
    const [abiInput, setAbiInput] = useState(DEFAULT_ABI_INPUT);
    const [pairName, setPairName] = useState('ETH/USD');

    // ABI State
    const [parsedFunctions, setParsedFunctions] = useState<ParsedFunction[]>([]);
    const [selectedFunction, setSelectedFunction] = useState<ParsedFunction | null>(null);
    const [functionInputs, setFunctionInputs] = useState<Record<string, string>>({});

    // Mapping State (Index of result array -> Schema Field)
    const [priceIndex, setPriceIndex] = useState(1); // 'answer' is usually index 1
    const [roundIdIndex, setRoundIdIndex] = useState(0); // 'roundId' is usually index 0
    const [timestampIndex, setTimestampIndex] = useState(3); // 'updatedAt' is usually index 3
    const [decimals, setDecimals] = useState(8); // Default decimals

    // Runtime State
    const [fetchedData, setFetchedData] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

    // Parse ABI on input change
    useEffect(() => {
        try {
            let abi: Abi = [];
            if (abiInput.trim().startsWith('[')) {
                // JSON ABI
                abi = JSON.parse(abiInput);
            } else {
                // Human-Readable ABI
                // Split by newlines and filter empty
                const signatures = abiInput.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                abi = parseAbi(signatures);
            }

            const functions: ParsedFunction[] = abi
                .filter(item => item.type === 'function' && (item.stateMutability === 'view' || item.stateMutability === 'pure'))
                .map((item: any) => ({
                    name: item.name,
                    inputs: item.inputs || [],
                    outputs: item.outputs || [],
                    signature: item.name // Simplified for display
                }));

            setParsedFunctions(functions);
            if (functions.length > 0 && !selectedFunction) {
                setSelectedFunction(functions[0]);
            }
        } catch (e) {
            // Invalid ABI, ignore
        }
    }, [abiInput]);

    // 1. Fetch Data
    const executeFunction = async (func: ParsedFunction) => {
        setIsLoading(true);
        setSelectedFunction(func);
        addLog(`Calling ${func.name} on ${targetAddress.slice(0, 6)}...`);
        setFetchedData(null);

        try {
            const publicClient = createPublicClient({
                chain: mainnet,
                transport: http(rpcUrl),
            });

            // Re-parse ABI for the call
            let abi: Abi = [];
            if (abiInput.trim().startsWith('[')) {
                abi = JSON.parse(abiInput);
            } else {
                const signatures = abiInput.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                abi = parseAbi(signatures);
            }

            // Prepare args
            const args = func.inputs.map((input, i) => functionInputs[`${func.name}-${i}`]);

            const result = await publicClient.readContract({
                address: targetAddress as `0x${string}`,
                abi: abi,
                functionName: func.name,
                args: args.length > 0 ? args : undefined,
            });

            addLog(`Result: ${result}`);

            // Normalize result to array for mapping
            const resultArray = Array.isArray(result) ? result : [result];
            setFetchedData(resultArray);

        } catch (error: any) {
            console.error(error);
            addLog(`Error fetching: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Publish to Somnia
    const publishToSomnia = async () => {
        if (!sdk || !fetchedData || !isConnected) return;
        setIsPublishing(true);
        addLog('Publishing to Somnia...');

        try {
            // Extract mapped values
            const priceVal = fetchedData[priceIndex] !== undefined ? BigInt(fetchedData[priceIndex]) : BigInt(0);
            const roundIdVal = fetchedData[roundIdIndex] !== undefined ? BigInt(fetchedData[roundIdIndex]) : BigInt(Date.now()); // Fallback to now if no round ID
            const timestampVal = fetchedData[timestampIndex] !== undefined ? BigInt(fetchedData[timestampIndex]) : BigInt(Math.floor(Date.now() / 1000));

            // Compute Schema ID
            const schemaId = await sdk.streams.computeSchemaId(priceFeedSchema);
            if (!schemaId) throw new Error('Failed to compute schema ID');

            // Register Schema (Idempotent)
            const schemaName = 'price-feed-v1';
            try {
                await sdk.streams.registerDataSchemas([
                    {
                        schemaName,
                        schema: priceFeedSchema,
                        parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000'
                    }
                ], true);
            } catch (error: any) {
                if (error.message && error.message.includes('Nothing to register')) {
                    addLog('Schema already registered, proceeding...');
                } else {
                    throw error;
                }
            }

            // Encode Data
            const encoder = new SchemaEncoder(priceFeedSchema);
            const encodedData = encoder.encodeData([
                { name: 'timestamp', value: timestampVal.toString(), type: 'uint64' },
                { name: 'price', value: priceVal.toString(), type: 'int256' },
                { name: 'roundId', value: roundIdVal.toString(), type: 'uint80' },
                { name: 'pair', value: pairName, type: 'string' },
            ]) as Hex;

            // Create unique Data ID
            const dataId = toHex(`price-${pairName}-${roundIdVal}`, { size: 32 });

            // Publish
            const tx = await sdk.streams.set([
                { id: dataId, schemaId: schemaId as `0x${string}`, data: encodedData }
            ]) as any;

            if (tx instanceof Error) throw tx;

            addLog(`Published! Tx: ${tx}`);
            alert('Data published successfully!');
        } catch (error: any) {
            console.error(error);
            addLog(`Error publishing: ${error.message}`);
        } finally {
            setIsPublishing(false);
        }
    };

    // 3. Read History
    const fetchHistory = async () => {
        if (!sdk || !address) return;
        setIsLoadingHistory(true);
        addLog('Fetching history from Somnia...');

        try {
            const schemaId = await sdk.streams.computeSchemaId(priceFeedSchema);
            const data = await sdk.streams.getAllPublisherDataForSchema({ schemaId: schemaId as `0x${string}`, publisher: address as `0x${string}` } as any, address as `0x${string}`);

            if (data && Array.isArray(data)) {
                const parsed = data.map((row: any) => {
                    const val = (field: any) => field?.value?.value ?? field?.value ?? '';
                    return {
                        timestamp: Number(val(row[0])),
                        price: val(row[1]).toString(),
                        roundId: val(row[2]).toString(),
                        pair: String(val(row[3])),
                    };
                }).sort((a, b) => b.timestamp - a.timestamp);

                setHistory(parsed);
                addLog(`Found ${parsed.length} historical records.`);
            } else {
                addLog('No history found.');
                setHistory([]);
            }
        } catch (error: any) {
            console.error(error);
            addLog(`Error fetching history: ${error.message}`);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Configuration & Actions */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="h-6 w-6 text-indigo-600" />
                        <h2 className="text-xl font-bold">Universal Data Oracle</h2>
                    </div>

                    <div className="space-y-6">
                        {/* Configuration */}
                        <div className="p-4 bg-slate-50 rounded-md border border-slate-100 space-y-4">
                            <div className="flex items-center gap-2 text-slate-900 font-medium">
                                <Settings className="h-4 w-4" />
                                <h3>Source Configuration</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label>RPC URL</Label>
                                    <Input value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contract Address</Label>
                                    <Input value={targetAddress} onChange={(e) => setTargetAddress(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>ABI (JSON or Human-Readable)</Label>
                                    <textarea
                                        value={abiInput}
                                        onChange={(e) => setAbiInput(e.target.value)}
                                        className="w-full h-32 p-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950"
                                        placeholder="Paste ABI here..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pair Name (Tag)</Label>
                                    <Input value={pairName} onChange={(e) => setPairName(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Step 1: Functions */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-900 font-medium">
                                <Code className="h-4 w-4" />
                                <h3>Available Functions</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {parsedFunctions.map((func, i) => (
                                    <Button
                                        key={i}
                                        onClick={() => executeFunction(func)}
                                        disabled={isLoading}
                                        variant={selectedFunction?.name === func.name ? 'default' : 'outline'}
                                        className="justify-start text-xs font-mono truncate"
                                    >
                                        <Play className="mr-2 h-3 w-3" />
                                        {func.name}
                                    </Button>
                                ))}
                                {parsedFunctions.length === 0 && (
                                    <div className="col-span-2 text-xs text-slate-500 italic text-center p-4 border border-dashed border-slate-200 rounded-md">
                                        No read functions found in ABI
                                    </div>
                                )}
                            </div>

                            {/* Inputs for selected function (if any) */}
                            {selectedFunction && selectedFunction.inputs.length > 0 && (
                                <div className="p-3 bg-slate-50 rounded-md border border-slate-100 space-y-2">
                                    <h4 className="text-xs font-bold text-slate-700">Inputs for {selectedFunction.name}</h4>
                                    {selectedFunction.inputs.map((input, i) => (
                                        <div key={i} className="space-y-1">
                                            <Label className="text-xs">{input.name || `arg${i}`} ({input.type})</Label>
                                            <Input
                                                value={functionInputs[`${selectedFunction.name}-${i}`] || ''}
                                                onChange={(e) => setFunctionInputs(prev => ({ ...prev, [`${selectedFunction.name}-${i}`]: e.target.value }))}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    ))}
                                    <Button onClick={() => executeFunction(selectedFunction)} disabled={isLoading} className="w-full mt-2">
                                        Execute Call
                                    </Button>
                                </div>
                            )}

                            {fetchedData && (
                                <div className="p-4 bg-slate-900 rounded-md text-slate-300 font-mono text-xs overflow-x-auto">
                                    <div className="mb-2 text-slate-500 font-sans font-bold uppercase tracking-wider">Raw Result Array</div>
                                    {fetchedData.map((val, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <span className="text-slate-500">[{idx}]</span>
                                            <span className="text-white">{val.toString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Mapping Configuration */}
                        {fetchedData && (
                            <div className="p-4 bg-indigo-50 rounded-md border border-indigo-100 space-y-4">
                                <div className="flex items-center gap-2 text-indigo-900 font-medium">
                                    <ArrowRight className="h-4 w-4" />
                                    <h3>Map Results to Schema</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Price Index</Label>
                                        <Input type="number" value={priceIndex} onChange={(e) => setPriceIndex(Number(e.target.value))} className="h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Round ID Index</Label>
                                        <Input type="number" value={roundIdIndex} onChange={(e) => setRoundIdIndex(Number(e.target.value))} className="h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Timestamp Index</Label>
                                        <Input type="number" value={timestampIndex} onChange={(e) => setTimestampIndex(Number(e.target.value))} className="h-8" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Decimals (for display)</Label>
                                    <Input type="number" value={decimals} onChange={(e) => setDecimals(Number(e.target.value))} className="h-8" />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Publish */}
                        <Button
                            onClick={publishToSomnia}
                            disabled={!fetchedData || isPublishing || !isConnected}
                            className="w-full"
                        >
                            {isPublishing ? 'Publishing...' : '2. Publish to Somnia'}
                            {!isPublishing && <Save className="ml-2 h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Logs */}
                <div className="bg-slate-950 p-4 rounded-lg h-[200px] overflow-y-auto font-mono text-xs text-slate-300">
                    {logs.length === 0 && <div className="text-slate-600 italic">System logs...</div>}
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                    ))}
                </div>
            </div>

            {/* Right: History */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <History className="h-6 w-6 text-slate-900" />
                        <h2 className="text-xl font-bold">On-Chain History</h2>
                    </div>
                    <Button onClick={fetchHistory} disabled={isLoadingHistory || !isConnected} variant="outline">
                        <RefreshCw className={`h-4 w-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <div className="flex-1 overflow-auto">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <History className="h-12 w-12 mb-2 opacity-20" />
                            <p>No history fetched yet</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Time</th>
                                    <th className="px-4 py-3">Price</th>
                                    <th className="px-4 py-3">Round</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono text-slate-500">
                                            {new Date(item.timestamp * 1000).toLocaleTimeString()}
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            ${(Number(item.price) / 10 ** decimals).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                            {item.roundId}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
