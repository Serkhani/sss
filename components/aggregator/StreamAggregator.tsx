'use client';

import React, { useState } from 'react';
import { useStream } from '../providers/StreamProvider';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { Layers, RefreshCw, Plus, Trash, Database, BookOpen } from 'lucide-react';
import { useToast } from '../providers/ToastProvider';

interface AggregatedRecord {
    timestamp: number;
    publisher: string;
    decoded: Record<string, any>;
    key: string; // Unique key for rendering
}

export default function StreamAggregator() {
    const { sdk } = useStream();
    const toast = useToast();

    // Configuration State
    const [schemaId, setSchemaId] = useState('');
    const [publishers, setPublishers] = useState<string[]>([]);
    const [newPublisher, setNewPublisher] = useState('');

    // Data State
    const [records, setRecords] = useState<AggregatedRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

    const addPublisher = () => {
        if (!newPublisher.startsWith('0x') || newPublisher.length !== 42) {
            toast.error('Invalid Address (must be 0x... and 42 chars)');
            return;
        }
        if (publishers.includes(newPublisher)) {
            toast.error('Publisher already added');
            return;
        }
        setPublishers([...publishers, newPublisher]);
        setNewPublisher('');
    };

    const removePublisher = (index: number) => {
        const newPubs = [...publishers];
        newPubs.splice(index, 1);
        setPublishers(newPubs);
    };

    const fetchAggregatedData = async () => {
        if (!sdk) return;
        if (!schemaId) {
            toast.error('Please enter a Schema ID');
            return;
        }
        if (publishers.length === 0) {
            toast.error('Please add at least one publisher');
            return;
        }

        setIsLoading(true);
        try {
            const allRecords: AggregatedRecord[] = [];

            // Parallel fetching
            await Promise.all(publishers.map(async (pub) => {
                try {
                    const data = await sdk.streams.getAllPublisherDataForSchema(schemaId as `0x${string}`, pub as `0x${string}`);

                    if (data && Array.isArray(data)) {
                        data.forEach((item: any) => {
                            // Assuming item is SchemaDecodedItem[] or object depending on SDK version?
                            // Based on LiveFeed usage: D.id, D.value?
                            // Let's inspect the `getAllPublisherDataForSchema` output structure from the previous step which was:
                            // getAllPublisherDataForSchema returns decoded data? 
                            // Wait, TrafficSimulator sends data. getAllPublisherDataForSchema usually returns objects if schema is registered.
                            // Let's assume it returns an array of decoded objects with fields.

                            // Actually, in the user request tutorial it says:
                            // (data as SchemaDecodedItem[][]).map(row => decodeTelemetryRecord(row))
                            // But my LiveFeed uses `data` directly.
                            // Let's try to infer from data structure. If it's an object with keys, use it.

                            // To be safe and generic, we will just store the raw decoded object.

                            // We need a timestamp. If the data doesn't have it, we might use a fallback or current time?
                            // But for aggregation sorting, we really need a timestamp in the data.

                            let timestamp = 0;
                            if (item.timestamp) timestamp = Number(item.timestamp);
                            else if (item.blockTimestamp) timestamp = Number(item.blockTimestamp);
                            else timestamp = Date.now(); // Fallback if no logical timestamp found

                            allRecords.push({
                                timestamp,
                                publisher: pub,
                                decoded: item,
                                key: `${pub}-${item.id || Math.random()}`
                            });
                        });
                    }
                } catch (e) {
                    console.error(`Failed to fetch for ${pub}`, e);
                }
            }));

            // Sort by timestamp descending (newest first)
            allRecords.sort((a, b) => b.timestamp - a.timestamp);

            setRecords(allRecords);
            setLastFetchTime(Date.now());
            toast.success(`Fetched ${allRecords.length} records`);

        } catch (e) {
            console.error(e);
            toast.error('Error fetching data');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="h-6 w-6 text-indigo-400" />
                    <h2 className="text-2xl font-bold tracking-tight text-white">Stream Aggregator</h2>
                    <a
                        href="https://docs.somnia.network/somnia-data-streams/advanced/working-with-multiple-publishers-in-a-shared-stream"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-white transition-colors ml-2"
                        title="View Documentation"
                    >
                        <BookOpen className="h-4 w-4" />
                    </a>
                </div>
                <div className="text-sm text-slate-400">
                    {lastFetchTime && `Last Updated: ${new Date(lastFetchTime).toLocaleTimeString()}`}
                </div>
            </div>

            <p className="text-sm text-slate-400 -mt-4">
                Aggregate, merge, and sort data from multiple publishers sending to the same schema.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-4 bg-slate-950/30 p-4 rounded-lg border border-slate-800 h-fit">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Configuration
                    </h3>

                    <div className="space-y-2">
                        <Label>Target Schema ID</Label>
                        <Input
                            value={schemaId}
                            onChange={(e) => setSchemaId(e.target.value)}
                            placeholder="0x..."
                            className="font-mono text-xs"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Tracked Publishers</Label>
                        <div className="flex gap-2">
                            <Input
                                value={newPublisher}
                                onChange={(e) => setNewPublisher(e.target.value)}
                                placeholder="0x..."
                                className="font-mono text-xs flex-1"
                            />
                            <Button onClick={addPublisher} disabled={!newPublisher} className="h-9 w-9 p-0">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {publishers.length === 0 && (
                                <div className="text-xs text-slate-500 text-center py-2">No publishers added</div>
                            )}
                            {publishers.map((pub, i) => (
                                <div key={i} className="flex justify-between items-center bg-black/40 p-2 rounded border border-slate-800/50">
                                    <span className="font-mono text-[10px] text-slate-300 truncate w-3/4" title={pub}>
                                        {pub}
                                    </span>
                                    <button onClick={() => removePublisher(i)} className="text-slate-500 hover:text-red-500">
                                        <Trash className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button
                        onClick={fetchAggregatedData}
                        disabled={isLoading || !schemaId || publishers.length === 0}
                        className="w-full"
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Fetching...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" /> Fetch & Aggregate
                            </>
                        )}
                    </Button>
                </div>

                {/* Results Table */}
                <div className="lg:col-span-2 flex flex-col bg-slate-950/30 rounded-lg border border-slate-800 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-3">Timestamp</div>
                        <div className="col-span-3">Publisher</div>
                        <div className="col-span-6">Data</div>
                    </div>

                    <div className="flex-1 overflow-auto p-0 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                        {records.length === 0 ? (
                            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                                {lastFetchTime ? 'No records found.' : 'Add publishers and click fetch to see data.'}
                            </div>
                        ) : (
                            records.map((record) => (
                                <div key={record.key} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-800/50 text-xs hover:bg-slate-800/20 transition-colors">
                                    <div className="col-span-3 text-slate-400 font-mono">
                                        {new Date(record.timestamp).toLocaleString()}
                                    </div>
                                    <div className="col-span-3 text-indigo-300 font-mono truncate" title={record.publisher}>
                                        {record.publisher.substring(0, 8)}...{record.publisher.substring(38)}
                                    </div>
                                    <div className="col-span-6 font-mono text-slate-300 break-all">
                                        {JSON.stringify(record.decoded)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-2 border-t border-slate-800 bg-slate-900/50 text-xs text-slate-500 text-right">
                        Total {records.length} records
                    </div>
                </div>
            </div>
        </div>
    );
}
