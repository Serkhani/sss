'use client';

import React, { useState } from 'react';
import { Search, BarChart2, List, Grid, Check, Box, Clock, User, Activity } from 'lucide-react';
import { Button, Input } from '@/components/ui/simple-ui';

// Mock Data based on the image
const MOCK_STREAMS = [
    { id: 1, name: 'GigStreamJob', address: '0x574b...fd11', usage: 2, publisher: '0xf93f...38d9', block: 248791458, created: '4h ago', public: true },
    { id: 2, name: 'player_stats', address: '0x7226...a728', usage: 1, publisher: '0x49c5...000a', block: 248683477, created: '8h ago', public: true },
    { id: 3, name: 'grid_cell', address: '0x7a75...e379', usage: 1, publisher: '0x49c5...000a', block: 248683477, created: '8h ago', public: true },
    { id: 4, name: 'oracle-1764346908726', address: '0x4ecb...fb58', usage: 2, publisher: '0xcc67...01dd', block: 248680391, created: '8h ago', public: true },
    { id: 5, name: 'custom_schema3', address: '0x1fe1...4904', usage: 0, publisher: '0xcc67...01dd', block: 248679331, created: '8h ago', public: true },
    { id: 6, name: 'resolution', address: '0x3bc6...cb30', usage: 1, publisher: '0xed10...b030', block: 248594262, created: '16h ago', public: true },
    { id: 7, name: 'GM3 Game Result Schema', address: '0x137e...ff78', usage: 2, publisher: '0x8c61...b125', block: 248512181, created: '12h ago', public: true },
    { id: 8, name: 'GM3 Game Move Schema', address: '0xb951...20d2', usage: 14, publisher: '0x8c61...b125', block: 248512067, created: '12h ago', public: true },
    { id: 9, name: 'GM3 Game Room', address: '0x7593...ef45', usage: 3, publisher: '0x8c61...b125', block: 248511825, created: '12h ago', public: true },
    { id: 10, name: 'GM3 Game Move', address: '0xe812b...aaa1', usage: 0, publisher: '0x8c61...b125', block: 248507036, created: '12h ago', public: true },
    { id: 11, name: 'gardensense-activity', address: '0x8c53...a948', usage: 5, publisher: '0x1d21...6198', block: 248436658, created: '14h ago', public: true },
    { id: 12, name: 'gardensense-plant', address: '0xd4ed...9fb6', usage: 6, publisher: '0x1d21...6198', block: 248436658, created: '14h ago', public: true },
    { id: 13, name: 'gardensense-alert', address: '0xcf9a...70f3', usage: 3, publisher: '0x1d21...6198', block: 248436658, created: '14h ago', public: true },
    { id: 14, name: 'gardensense-control', address: '0xb5cb...445a', usage: 3, publisher: '0x1d21...6198', block: 248436658, created: '14h ago', public: true },
    { id: 15, name: 'gardensense-sensor', address: '0x7185...788e', usage: 1, publisher: '0x1d21...6198', block: 248436658, created: '14h ago', public: true },
];

export default function StreamExplorer() {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'popular' | 'recent'>('recent');

    const filteredStreams = MOCK_STREAMS.filter(stream =>
        stream.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stream.publisher.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6">
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
                            <div className="text-xl font-bold text-white">73</div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <div className="text-xs text-slate-500 mb-1">Publishers</div>
                            <div className="text-xl font-bold text-white">25</div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <div className="text-xs text-slate-500 mb-1">Network</div>
                            <div className="text-sm font-bold text-indigo-400">SOMNIA MAINNET</div>
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
                    </div>
                    <div className="flex items-center gap-2 w-96">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search schemas and publishers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                            />
                        </div>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white border-none">
                            SEARCH
                        </Button>
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
                    {filteredStreams.map((stream, index) => (
                        <div
                            key={stream.id}
                            className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-800/50 items-center hover:bg-slate-800/30 transition-colors ${index % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/20'}`}
                        >
                            <div className="col-span-4 flex flex-col">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500/50" />
                                    <span className="font-medium text-slate-200">{stream.name}</span>
                                </div>
                                <span className="text-xs text-slate-500 ml-4 font-mono">{stream.address}</span>
                            </div>
                            <div className="col-span-1 text-center">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${stream.usage > 0 ? 'bg-orange-500/10 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
                                    {stream.usage}
                                </span>
                            </div>
                            <div className="col-span-3 flex items-center gap-2">
                                <User className="w-3 h-3 text-slate-500" />
                                <span className="text-sm text-indigo-300 font-mono">{stream.publisher}</span>
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
                    ))}
                </div>
            </div>
        </div>
    );
}
