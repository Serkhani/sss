'use client';

import React, { useState, useEffect } from 'react';
import { Search, BarChart2, List, Activity, RefreshCw, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/simple-ui';
import { useStream } from '@/components/providers/StreamProvider';
import StreamDetailModal from './StreamDetailModal';
import { createPublicClient, http, parseAbiItem, defineChain, toHex } from 'viem';

// Define Somnia Testnet Chain
const somniaTestnet = defineChain({
    id: 50312,
    name: 'Somnia Testnet',
    network: 'somnia-testnet',
    nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
    rpcUrls: {
        default: { http: [process.env.NEXT_PUBLIC_RPC_URL_SOMNIA || 'https://dream-rpc.somnia.network'] },
        public: { http: [process.env.NEXT_PUBLIC_RPC_URL_SOMNIA || 'https://dream-rpc.somnia.network'] },
    },
    testnet: true,
});

export default function StreamExplorer() {
    const { sdk } = useStream();
    const [searchTerm, setSearchTerm] = useState('');
    const [streams, setStreams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStream, setSelectedStream] = useState<any>(null);

    // Create client for direct log querying
    const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http()
    });

    const CONTRACT_ADDRESS = "0xC1d833a80469854a7450Dd187224b2ceE5ecE264";

    // RPC Limit Config
    const RPC_CHUNK_SIZE = 800; // Safe margin below 1000
    const SCAN_LOOKBACK = 30000; // Scan last ~30k blocks (approx 24h) to avoid browser timeout

    const fetchSchemas = async () => {
        if (!sdk) return;
        setIsLoading(true);
        try {
            // 1. Fetch all raw schema definitions
            const allSchemas = await sdk.streams.getAllSchemas();

            // 2. Fetch Registry Events with Chunking
            const currentBlock = await publicClient.getBlockNumber();
            const startBlock = currentBlock - BigInt(SCAN_LOOKBACK) > 0n
                ? currentBlock - BigInt(SCAN_LOOKBACK)
                : 0n;

            const logs = [];

            // Loop to fetch logs in chunks
            for (let i = startBlock; i < currentBlock; i += BigInt(RPC_CHUNK_SIZE)) {
                const to = (i + BigInt(RPC_CHUNK_SIZE)) > currentBlock ? currentBlock : i + BigInt(RPC_CHUNK_SIZE);
                try {
                    const chunk = await publicClient.getLogs({
                        address: CONTRACT_ADDRESS,
                        event: parseAbiItem('event DataSchemaRegistered(bytes32 indexed schemaId)'),
                        fromBlock: i,
                        toBlock: to
                    });
                    logs.push(...chunk);
                } catch (err) {
                    console.warn(`Failed to fetch logs for chunk ${i}-${to}`, err);
                    // Continue to next chunk even if one fails
                }
            }

            // Create a map: SchemaID -> Log Details
            const logMap = new Map();
            for (const log of logs) {
                const schemaId = log.args.schemaId;
                if (schemaId) {
                    logMap.set(schemaId, {
                        blockNumber: log.blockNumber,
                        txHash: log.transactionHash,
                    });
                }
            }

            if (Array.isArray(allSchemas)) {
                const enriched = await Promise.all(allSchemas.map(async (schemaString: string) => {
                    let id = toHex('?', { size: 32 });
                    let name = 'Unknown Schema';
                    let publisher = toHex('?', { size: 20 });
                    let block = '?';
                    let created = '?';
                    let fullDate = '?';
                    let txHash = '?';

                    try {
                        // A. Compute Schema ID
                        const computedId = await sdk.streams.computeSchemaId(schemaString);

                        if (computedId) {
                            id = computedId as `0x${string}`;

                            // B. Fetch Schema Name
                            try {
                                const fetchedName = (await sdk.streams.schemaIdToSchemaName(id)).toString();
                                if (fetchedName) name = fetchedName;
                            } catch (e) { /* Ignore */ }

                            // C. Get Creation Details from Logs
                            const logData = logMap.get(id);
                            if (logData) {
                                block = logData.blockNumber.toString();
                                txHash = logData.txHash;

                                // Fetch Block Time & Transaction Sender (Publisher)
                                try {
                                    // Optimization: We could batch these too, but doing individually for found logs is okay
                                    const [blockData, txData] = await Promise.all([
                                        publicClient.getBlock({ blockNumber: logData.blockNumber }),
                                        publicClient.getTransaction({ hash: logData.txHash })
                                    ]);

                                    const timestamp = Number(blockData.timestamp);
                                    created = new Date(timestamp * 1000).toLocaleTimeString();
                                    fullDate = new Date(timestamp * 1000).toLocaleString();
                                    publisher = txData.from;
                                } catch (err) {
                                    console.warn("Failed to fetch block/tx details", err);
                                }
                            }
                        }
                    } catch (e) {
                        console.log('Error processing schema:', schemaString, e);
                    }

                    return {
                        id,
                        name: name !== 'Unknown Schema' ? name : `Schema ${id.substring(0, 6)}...`,
                        address: id,
                        publisher,
                        block,
                        created,
                        fullDate,
                        schemaDefinition: schemaString,
                        txHash,
                    };
                }));

                // Sort by recent block by default
                const sorted = enriched.sort((a, b) => {
                    const blockA = a.block === '?' ? 0 : Number(a.block);
                    const blockB = b.block === '?' ? 0 : Number(b.block);
                    return blockB - blockA;
                });

                setStreams(sorted);
            }
        } catch (error) {
            console.log('Failed to fetch schemas:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchemas();
    }, [sdk]);

    const filteredStreams = streams.filter(stream =>
        stream.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stream.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6">
            <StreamDetailModal stream={selectedStream} onClose={() => setSelectedStream(null)} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-slate-900/30 backdrop-blur-sm rounded-xl border border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-500" />
                        <h2 className="text-lg font-bold text-white">Recent Data Streams</h2>
                        <Button variant="ghost" onClick={fetchSchemas} disabled={isLoading} className="h-8 w-8 p-0">
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 w-96">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by Name or Schema ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-950/50 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-12">Schema Name & ID</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            Scanning blockchain (last 30k blocks)...
                        </div>
                    ) : filteredStreams.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            No streams found.
                        </div>
                    ) : (
                        filteredStreams.map((stream, index) => (
                            <div
                                key={stream.id}
                                onClick={() => setSelectedStream(stream)}
                                className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-800/50 items-center hover:bg-slate-800/30 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/20'}`}
                            >
                                <div className="col-span-12 flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500/50" />
                                        <span className="font-medium text-slate-200 truncate" title={stream.name}>{stream.name}</span>
                                    </div>
                                    <span className="text-xs text-slate-500 ml-4 font-mono truncate" title={stream.id}>{stream.id}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}