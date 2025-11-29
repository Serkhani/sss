'use client';

import React, { useState, useEffect } from 'react';
import { Search, Activity, RefreshCw, List, Box, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/simple-ui';
import { useStream } from '@/components/providers/StreamProvider';
import { createPublicClient, http, defineChain, decodeEventLog, parseAbi } from 'viem';
import EventDetailModal from './EventDetailModal';

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

// Minimal ABI for Event Decoding based on your provided file
const EVENT_ABI = [
    "event DataSchemaRegistered(bytes32 indexed schemaId)",
    "event ESStoreEvent(bytes32 indexed schemaId, bytes32 indexed dataId)",
    "event EmitterUpdated(bytes32 indexed eventTopic, address indexed emitter, bool isEmitter)",
    "event EventSchemaRegistered(bytes32 indexed eventTopic, string id)",
    "event IdentityCreated(address indexed wallet)",
    "event IdentityDeleted(address indexed wallet)",
    "event IsEventEmissionOpen(bytes32 indexed eventTopic, bool isOpen)",
    "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    "event RoleGranted(address indexed wallet, uint8 indexed role)",
    "event RoleRevoked(address indexed wallet, uint8 indexed role)"
] as const;

export default function EventExplorer() {
    const { sdk } = useStream();
    const [searchTerm, setSearchTerm] = useState('');
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http()
    });

    const CONTRACT_ADDRESS = "0xC1d833a80469854a7450Dd187224b2ceE5ecE264";
    const RPC_CHUNK_SIZE = 800;
    const SCAN_LOOKBACK = 30000; // Look back ~30k blocks

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const currentBlock = await publicClient.getBlockNumber();
            const startBlock = currentBlock - BigInt(SCAN_LOOKBACK) > 0n
                ? currentBlock - BigInt(SCAN_LOOKBACK)
                : 0n;

            let allLogs: any[] = [];

            // 1. Fetch Logs in Chunks
            for (let i = startBlock; i < currentBlock; i += BigInt(RPC_CHUNK_SIZE)) {
                const to = (i + BigInt(RPC_CHUNK_SIZE)) > currentBlock ? currentBlock : i + BigInt(RPC_CHUNK_SIZE);
                try {
                    const chunk = await publicClient.getLogs({
                        address: CONTRACT_ADDRESS,
                        fromBlock: i,
                        toBlock: to
                    });
                    allLogs.push(...chunk);
                } catch (err) {
                    console.warn(`Failed to fetch logs for chunk ${i}-${to}`, err);
                }
            }

            // 2. Optimization: Fetch Block Timestamps efficiently
            // Extract unique block numbers to avoid duplicate API calls
            const uniqueBlockNumbers = [...new Set(allLogs.map(l => l.blockNumber))];
            const blockMap = new Map();

            // Fetch blocks in parallel batches of 20 to avoid rate limits
            const BLOCK_BATCH_SIZE = 20;
            for (let i = 0; i < uniqueBlockNumbers.length; i += BLOCK_BATCH_SIZE) {
                const batch = uniqueBlockNumbers.slice(i, i + BLOCK_BATCH_SIZE);
                await Promise.all(batch.map(async (bn) => {
                    try {
                        const block = await publicClient.getBlock({ blockNumber: bn });
                        blockMap.set(bn.toString(), Number(block.timestamp) * 1000);
                    } catch (e) { /* ignore missing blocks */ }
                }));
            }

            // 3. Process and Decode Logs
            const processed = allLogs.map((log) => {
                let eventName = 'Unknown Event';
                let decodedArgs: any = {};

                try {
                    // Attempt to decode the log using our ABI
                    const decoded = decodeEventLog({
                        abi: parseAbi(EVENT_ABI),
                        data: log.data,
                        topics: log.topics,
                        strict: false
                    });
                    eventName = decoded.eventName;
                    decodedArgs = decoded.args;
                } catch (e) {
                    // Fallback for events not in our minimal ABI
                    eventName = 'Raw Log';
                }

                return {
                    uniqueId: `${log.transactionHash}-${log.logIndex}`,
                    name: eventName,
                    args: decodedArgs,
                    transactionHash: log.transactionHash,
                    blockNumber: log.blockNumber.toString(),
                    timestamp: blockMap.get(log.blockNumber.toString()) || Date.now(),
                    topics: log.topics,
                    data: log.data
                };
            });

            // Sort by newest first
            const sorted = processed.sort((a, b) => b.timestamp - a.timestamp);
            setEvents(sorted);

        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const filteredEvents = events.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.transactionHash.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6">
            <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />

            <div className="flex-1 flex flex-col bg-slate-900/30 backdrop-blur-sm rounded-xl border border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-lg font-bold text-white">Event Explorer</h2>
                        <Button variant="ghost" onClick={fetchEvents} disabled={isLoading} className="h-8 w-8 p-0">
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 w-96">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search Event Name or Tx Hash..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-950/50 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-3">Event Name</div>
                    <div className="col-span-5">Transaction Hash</div>
                    <div className="col-span-2">Block</div>
                    <div className="col-span-2">Time</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            Scanning blockchain (last 30k blocks)...
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            No events found.
                        </div>
                    ) : (
                        filteredEvents.map((event, index) => (
                            <div
                                key={event.uniqueId}
                                onClick={() => setSelectedEvent(event)}
                                className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-800/50 items-center hover:bg-slate-800/30 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/20'}`}
                            >
                                <div className="col-span-3 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${event.name === 'ESStoreEvent' ? 'bg-green-500' : 'bg-indigo-500'}`} />
                                    <span className="font-medium text-slate-200 truncate" title={event.name}>{event.name}</span>
                                </div>
                                <div className="col-span-5 font-mono text-xs text-slate-400 truncate hover:text-indigo-400 transition-colors" title={event.transactionHash}>
                                    {event.transactionHash}
                                </div>
                                <div className="col-span-2 flex items-center gap-2 text-xs text-slate-500">
                                    <Box className="w-3 h-3" />
                                    {event.blockNumber}
                                </div>
                                <div className="col-span-2 flex items-center gap-2 text-xs text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    {new Date(event.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}