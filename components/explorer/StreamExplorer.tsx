'use client';

import React, { useState, useEffect } from 'react';
import { Search, BarChart2, List, Grid, Check, Box, Clock, User, Activity, RefreshCw } from 'lucide-react';
import { Button, Input } from '@/components/ui/simple-ui';
import { useStream } from '@/components/providers/StreamProvider';
import StreamDetailModal from './StreamDetailModal';

export default function StreamExplorer() {
    const { sdk } = useStream();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'popular' | 'recent'>('recent');
    const [streams, setStreams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, publishers: 0 });
    const [selectedStream, setSelectedStream] = useState<any>(null);

    const fetchSchemas = async () => {
        if (!sdk) return;
        setIsLoading(true);
        try {
            // Fetch all schemas
            const allSchemas = await sdk.streams.getAllSchemas();

            if (Array.isArray(allSchemas)) {
                const mapped = allSchemas.map((s: any, i: number) => {
                    // Try to extract name from schema string if schemaName is missing
                    // Schema string format: "name(type field, ...)" or just "type field"
                    let derivedName = 'Unknown Schema';
                    if (s.schema) {
                        const match = s.schema.match(/^([a-zA-Z0-9_]+)\(/);
                        if (match) derivedName = match[1];
                    }

                    return {
                        id: s.id ? s.id.toString() : i,
                        name: s.schemaName || s.name || derivedName,
                        address: s.id ? s.id.toString() : '?',
                        usage: s.usageCount ? Number(s.usageCount) : 0, // Check for usageCount
                        publisher: s.creator || s.publisher || 'Unknown',
                        block: s.blockNumber ? s.blockNumber.toString() : '?',
                        created: s.timestamp ? new Date(Number(s.timestamp) * 1000).toLocaleTimeString() : '?',
                        fullDate: s.timestamp ? new Date(Number(s.timestamp) * 1000).toLocaleString() : '?',
                        public: true,
                        schemaDefinition: s.schema,
                        txHash: s.transactionHash || s.txHash,
                        raw: s
                    };
                });

                // Sort by recent by default (assuming higher index/ID is newer if no timestamp)
                mapped.sort((a, b) => {
                    if (a.created !== '?' && b.created !== '?') {
                        return new Date(b.fullDate).getTime() - new Date(a.fullDate).getTime();
                    }
                    return 0;
                });

                setStreams(mapped);
                setStats({
                    total: mapped.length,
                    publishers: new Set(mapped.map((s: any) => s.publisher)).size
                });
            }
        } catch (error) {
            console.error('Failed to fetch schemas:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchemas();
    }, [sdk]);

    const filteredStreams = streams.filter(stream =>
        stream.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stream.publisher.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6">
            <StreamDetailModal stream={selectedStream} onClose={() => setSelectedStream(null)} />

            {/* Sidebar */}
            <div className="w-64 flex-none space-y-6">
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <List className="w-3 h-3" /> Sort By
                    </h3>
                    <div className="space-y-1">
                        <button
                            onClick={() => setSortBy('popular')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${sortBy === 'popular' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/50'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${sortBy === 'popular' ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                            Most Popular
                        </button>
                        <button
                            onClick={() => setSortBy('recent')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${sortBy === 'recent' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'text-slate-400 hover:bg-slate-800/50'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${sortBy === 'recent' ? 'bg-orange-400' : 'bg-slate-600'}`} />
                            Most Recent
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <BarChart2 className="w-3 h-3" /> Stats
                    </h3>
                    <div className="space-y-2">
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <div className="text-xs text-slate-500 mb-1">Total Schemas</div>
                            <div className="text-xl font-bold text-white">{stats.total}</div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <div className="text-xs text-slate-500 mb-1">Publishers</div>
                            <div className="text-xl font-bold text-white">{stats.publishers}</div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <div className="text-xs text-slate-500 mb-1">Network</div>
                            <div className="text-sm font-bold text-indigo-400">SOMNIA TESTNET</div>
                        </div>
                    </div>
                </div>
            </div>

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
                                placeholder="Search schemas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-950/50 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-4">Schema Name</div>
                    <div className="col-span-1 text-center">Usage</div>
                    <div className="col-span-3">Publisher</div>
                    <div className="col-span-2">Block</div>
                    <div className="col-span-1">Created</div>
                    <div className="col-span-1 text-center">Public</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            Loading streams...
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
                                <div className="col-span-4 flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500/50" />
                                        <span className="font-medium text-slate-200 truncate" title={stream.name}>{stream.name}</span>
                                    </div>
                                    <span className="text-xs text-slate-500 ml-4 font-mono truncate" title={stream.address}>{stream.address}</span>
                                </div>
                                <div className="col-span-1 text-center">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${stream.usage > 0 ? 'bg-orange-500/10 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
                                        {stream.usage}
                                    </span>
                                </div>
                                <div className="col-span-3 flex items-center gap-2">
                                    <User className="w-3 h-3 text-slate-500" />
                                    <span className="text-sm text-indigo-300 font-mono truncate" title={stream.publisher}>{stream.publisher}</span>
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Box className="w-3 h-3 text-slate-500" />
                                    <span className="text-sm text-slate-400 font-mono">{stream.block}</span>
                                </div>
                                <div className="col-span-1 flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    <span className="text-sm text-slate-400">{stream.created}</span>
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    {stream.public && <Check className="w-4 h-4 text-green-500" />}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
