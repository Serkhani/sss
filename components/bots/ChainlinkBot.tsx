'use client';

import React, { useState, useEffect } from 'react';
import { useStream } from '../providers/StreamProvider';
import { useToast } from '../providers/ToastProvider';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { createPublicClient, http, parseAbi, toHex, Hex, Abi } from 'viem';
import { mainnet } from 'viem/chains';
import { waitForTransactionReceipt } from 'viem/actions';
import { SchemaEncoder } from '@somnia-chain/streams';
import { RefreshCw, Save, History, Settings, ArrowRight, Code, Play, Bot, Plus, Trash2 } from 'lucide-react';
import { parseSchemaString, SchemaField } from '@/lib/utils/schemaParser';

// Defaults (Chainlink ETH/USD on Sepolia)
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

export default function ChainlinkBot() {
    const { sdk, isConnected, address, publicClient } = useStream();
    const toast = useToast();

    // Configuration State
    const [targetAddress, setTargetAddress] = useState(DEFAULT_TARGET_ADDRESS);
    const [rpcUrl, setRpcUrl] = useState(DEFAULT_RPC_URL);
    const [abiInput, setAbiInput] = useState(DEFAULT_ABI_INPUT);
    const [pairName, setPairName] = useState('ETH/USD');

    // ABI State
    const [parsedFunctions, setParsedFunctions] = useState<ParsedFunction[]>([]);
    const [selectedFunction, setSelectedFunction] = useState<ParsedFunction | null>(null);
    const [functionInputs, setFunctionInputs] = useState<Record<string, string>>({});

    // Somnia Schema State
    const [somniaSchema, setSomniaSchema] = useState('uint64 timestamp, int256 price, uint80 roundId, string pair');
    const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
    const [fieldMappings, setFieldMappings] = useState<Record<string, { type: 'index' | 'static' | 'timestamp', value: string }>>({});

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
                abi = JSON.parse(abiInput);
            } else {
                const signatures = abiInput.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                abi = parseAbi(signatures);
            }

            const functions: ParsedFunction[] = abi
                .filter(item => item.type === 'function' && (item.stateMutability === 'view' || item.stateMutability === 'pure'))
                .map((item: any) => ({
                    name: item.name,
                    inputs: item.inputs || [],
                    outputs: item.outputs || [],
                    signature: item.name
                }));

            setParsedFunctions(functions);
            if (functions.length > 0 && !selectedFunction) {
                setSelectedFunction(functions[0]);
            }
        } catch (e) {
            // Invalid ABI, ignore
        }
    }, [abiInput]);

    // Parse Somnia Schema
    useEffect(() => {
        const fields = parseSchemaString(somniaSchema);
        setSchemaFields(fields);

        // Initialize mappings if empty
        setFieldMappings(prev => {
            const newMappings = { ...prev };
            fields.forEach(f => {
                if (!newMappings[f.name]) {
                    // Smart defaults
                    if (f.name === 'timestamp') newMappings[f.name] = { type: 'timestamp', value: '' };
                    else if (f.name === 'pair') newMappings[f.name] = { type: 'static', value: pairName };
                    else newMappings[f.name] = { type: 'index', value: '0' };
                }
            });
            return newMappings;
        });
    }, [somniaSchema, pairName]);

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

            let abi: Abi = [];
            if (abiInput.trim().startsWith('[')) {
                abi = JSON.parse(abiInput);
            } else {
                const signatures = abiInput.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                abi = parseAbi(signatures);
            }

            const args = func.inputs.map((input, i) => functionInputs[`${func.name}-${i}`]);

            const result = await publicClient.readContract({
                address: targetAddress as `0x${string}`,
                abi: abi,
                functionName: func.name,
                args: args.length > 0 ? args : undefined,
            });

            // Normalize result to array
            const resultArray = Array.isArray(result) ? result : [result];
            setFetchedData(resultArray);
            addLog(`Result: ${JSON.stringify(resultArray, (key, value) => typeof value === 'bigint' ? value.toString() : value)}`);

        } catch (error: any) {
            console.error(error);
            addLog(`Error fetching: ${error.message}`);
            toast.error(`Error fetching: ${error.message}`);
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
            // Compute Schema ID
            const schemaId = await sdk.streams.computeSchemaId(somniaSchema);
            if (!schemaId) throw new Error('Failed to compute schema ID');

            // Register Schema (Idempotent)
            try {
                await sdk.streams.registerDataSchemas([
                    {
                        schemaName: `oracle-${Date.now()}`, // Unique name to avoid conflicts in this demo
                        schema: somniaSchema,
                        parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000'
                    }
                ], true);
            } catch (error: any) {
                if (error.message && error.message.includes('Nothing to register')) {
                    addLog('Schema already registered, proceeding...');
                } else {
                    // Ignore registration errors for now as it might be already registered
                    console.warn('Registration warning:', error);
                }
            }

            // Map Data
            const dataToEncode = schemaFields.map(field => {
                const mapping = fieldMappings[field.name];
                let value: any;

                if (mapping.type === 'static') {
                    value = mapping.value;
                } else if (mapping.type === 'timestamp') {
                    value = Math.floor(Date.now() / 1000);
                } else {
                    // Index mapping
                    const idx = parseInt(mapping.value);
                    if (isNaN(idx) || idx < 0 || idx >= fetchedData.length) {
                        throw new Error(`Invalid index ${idx} for field ${field.name}`);
                    }
                    value = fetchedData[idx];
                }

                // Type conversion
                if (field.type.includes('int')) {
                    value = BigInt(value);
                } else if (field.type === 'bool') {
                    value = Boolean(value);
                } else {
                    value = String(value);
                }

                return { name: field.name, type: field.type, value };
            });

            // Encode Data
            const encoder = new SchemaEncoder(somniaSchema);
            const encodedData = encoder.encodeData(dataToEncode) as Hex;

            // Create unique Data ID (hash of timestamp + random)
            const idVal = BigInt(Date.now());
            const dataId = toHex(`sss-${idVal}`, { size: 32 })

            // Publish
            const tx = await sdk.streams.set([
                { id: dataId, schemaId: schemaId as `0x${string}`, data: encodedData }
            ]) as any;

            if (tx instanceof Error) throw tx;

            addLog(`Published! Tx: ${tx}`);

            // Wait for receipt
            if (publicClient) {
                addLog('Waiting for confirmation...');
                const receipt = await waitForTransactionReceipt(publicClient, { hash: tx });
                if (receipt.status === 'success') {
                    addLog(`Confirmed! Block: ${receipt.blockNumber}`);
                    toast.success('Data published successfully!');
                } else {
                    addLog('Transaction failed on-chain.');
                    toast.error('Transaction failed on-chain.');
                }
            } else {
                toast.success('Data published (no wait)!');
            }
        } catch (error: any) {
            console.error(error);
            addLog(`Error publishing: ${error.message}`);
            toast.error(`Error publishing: ${error.message}`);
        } finally {
            setIsPublishing(false);
        }
    };

    // 3. Read History (Simplified for dynamic schema)
    const fetchHistory = async () => {
        if (!sdk || !address) return;
        setIsLoadingHistory(true);
        addLog('Fetching history from Somnia...');

        try {
            const schemaId = await sdk.streams.computeSchemaId(somniaSchema);
            const data = await sdk.streams.getAllPublisherDataForSchema(schemaId as `0x${string}`, address as `0x${string}`);

            if (data && Array.isArray(data)) {
                // Map data to schema fields
                const parsed = data.map((row: any) => {
                    const rowObj: Record<string, any> = {};
                    let timestamp = 0;

                    row.forEach((col: any, idx: number) => {
                        const fieldName = schemaFields[idx]?.name || `field_${idx}`;
                        const val = col?.value?.value ?? col?.value ?? '';
                        rowObj[fieldName] = val.toString();

                        if (fieldName.toLowerCase() === 'timestamp') {
                            timestamp = Number(val);
                        }
                    });

                    // If no timestamp field found, try to use the first field if it looks like a timestamp
                    if (timestamp === 0 && row.length > 0) {
                        const firstVal = Number(row[0]?.value?.value ?? row[0]?.value ?? 0);
                        if (firstVal > 1600000000 && firstVal < 20000000000) { // Rough check for seconds/ms
                            timestamp = firstVal;
                        }
                    }

                    return {
                        timestamp,
                        data: rowObj
                    };
                }).sort((a, b) => b.timestamp - a.timestamp);

                setHistory(parsed as any);
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
                <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-xl border border-slate-800 shadow-xl">
                    <div className="flex items-center gap-2">
                        <Bot className="h-6 w-6 text-indigo-500" />
                        <h2 className="text-2xl font-bold tracking-tight text-white">Chainlink Oracle</h2>
                    </div>
                    <p className="text-sm text-slate-400">
                        Fetch data from chainlink and stream it to Somnia in real-time.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Configuration */}
                    <div className="p-4 bg-slate-950/30 rounded-lg border border-slate-800 space-y-4">
                        <div className="flex items-center gap-2 text-slate-200 font-medium">
                            <Settings className="h-4 w-4 text-indigo-400" />
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
                                    className="w-full h-32 p-3 text-xs font-mono bg-slate-950/50 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Paste ABI here..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 1: Functions */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-200 font-medium">
                            <Code className="h-4 w-4 text-indigo-400" />
                            <h3>1. Fetch Data</h3>
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
                        </div>

                        {/* Inputs for selected function (if any) */}
                        {selectedFunction && selectedFunction.inputs.length > 0 && (
                            <div className="p-4 bg-slate-950/30 rounded-lg border border-slate-800 space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inputs for {selectedFunction.name}</h4>
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
                                {fetchedData.map((val, idx) => {
                                    const outputName = selectedFunction?.outputs[idx]?.name;
                                    const outputType = selectedFunction?.outputs[idx]?.type;
                                    return (
                                        <div key={idx} className="flex gap-2 border-b border-slate-800/50 py-1 last:border-0 items-center">
                                            <span className="text-indigo-400 font-bold w-6">[{idx}]</span>
                                            {outputName && <span className="text-slate-400 italic mr-2">{outputName}:</span>}
                                            <span className="text-white break-all">
                                                {typeof val === 'bigint' ? val.toString() : String(val)}
                                            </span>
                                            {outputType && <span className="text-slate-600 text-[10px] ml-auto">({outputType})</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Step 2: Mapping & Publish */}
                    {fetchedData && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-200 font-medium">
                                <ArrowRight className="h-4 w-4 text-indigo-400" />
                                <h3>2. Map & Publish</h3>
                            </div>

                            <div className="p-4 bg-indigo-950/20 rounded-lg border border-indigo-500/30 space-y-4">
                                <div className="space-y-2">
                                    <Label>Somnia Schema Definition</Label>
                                    <Input
                                        value={somniaSchema}
                                        onChange={(e) => setSomniaSchema(e.target.value)}
                                        placeholder="e.g. uint64 timestamp, int256 price"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Field Mapping</h4>
                                    {schemaFields.map((field) => (
                                        <div key={field.name} className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-4 text-xs font-mono text-slate-300 truncate" title={field.name}>
                                                {field.name} <span className="text-slate-500">({field.type})</span>
                                            </div>
                                            <div className="col-span-3">
                                                <select
                                                    className="w-full h-8 text-xs bg-slate-900 border border-slate-700 rounded px-2 text-slate-300"
                                                    value={fieldMappings[field.name]?.type || 'index'}
                                                    onChange={(e) => setFieldMappings(prev => ({
                                                        ...prev,
                                                        [field.name]: { ...prev[field.name], type: e.target.value as any }
                                                    }))}
                                                >
                                                    <option value="index">Result Index</option>
                                                    <option value="static">Static Value</option>
                                                    <option value="timestamp">Current Time</option>
                                                </select>
                                            </div>
                                            <div className="col-span-5">
                                                {fieldMappings[field.name]?.type === 'index' ? (
                                                    <select
                                                        className="w-full h-8 text-xs bg-slate-900 border border-slate-700 rounded px-2 text-slate-300"
                                                        value={fieldMappings[field.name]?.value || '0'}
                                                        onChange={(e) => setFieldMappings(prev => ({
                                                            ...prev,
                                                            [field.name]: { ...prev[field.name], value: e.target.value }
                                                        }))}
                                                    >
                                                        {fetchedData.map((_, idx) => {
                                                            const outputName = selectedFunction?.outputs[idx]?.name;
                                                            return (
                                                                <option key={idx} value={idx}>
                                                                    [{idx}] {outputName ? outputName : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                ) : fieldMappings[field.name]?.type === 'static' ? (
                                                    <Input
                                                        className="h-8 text-xs"
                                                        value={fieldMappings[field.name]?.value || ''}
                                                        onChange={(e) => setFieldMappings(prev => ({
                                                            ...prev,
                                                            [field.name]: { ...prev[field.name], value: e.target.value }
                                                        }))}
                                                        placeholder="Value"
                                                    />
                                                ) : (
                                                    <div className="text-xs text-slate-500 italic px-2">Auto-generated</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    onClick={publishToSomnia}
                                    disabled={isPublishing || !isConnected}
                                    className="w-full"
                                >
                                    {isPublishing ? 'Publishing...' : 'Publish to Somnia'}
                                    {!isPublishing && <Save className="ml-2 h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    )}
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
            <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <History className="h-6 w-6 text-indigo-500" />
                        <h2 className="text-xl font-bold text-white">On-Chain History</h2>
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
                        <div className="space-y-2">
                            {history.map((item: any, i) => (
                                <div key={i} className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 hover:border-indigo-500/30 transition-colors">
                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                        <span>{item.timestamp ? new Date(item.timestamp * 1000).toLocaleTimeString() : 'Unknown Time'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        {Object.entries(item.data).map(([key, val]: any) => (
                                            <div key={key} className="text-xs">
                                                <span className="text-slate-500 mr-1">{key}:</span>
                                                <span className="text-slate-300 font-mono break-all">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

