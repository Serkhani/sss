'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStream } from '../providers/StreamProvider';
import { parseSchemaString, SchemaField } from '@/lib/utils/schemaParser';
import { generateRandomData } from '@/lib/utils/randomizer';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { SchemaEncoder } from '@somnia-chain/streams';
import { Zap, Activity, StopCircle } from 'lucide-react';

export default function TrafficSimulator() {
    const { sdk, isConnected } = useStream();
    const [schemaString, setSchemaString] = useState('');
    const [isChaosMode, setIsChaosMode] = useState(false);
    const [packetCount, setPacketCount] = useState(0);
    const [lastPacketTime, setLastPacketTime] = useState<number | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const toggleChaos = () => {
        if (isChaosMode) {
            stopChaos();
        } else {
            startChaos();
        }
    };

    const startChaos = () => {
        if (!sdk || !schemaString) {
            alert('Please connect wallet and enter a valid schema string.');
            return;
        }
        setIsChaosMode(true);

        const fields = parseSchemaString(schemaString);
        const encoder = new SchemaEncoder(schemaString);

        intervalRef.current = setInterval(async () => {
            try {
                const data = generateRandomData(fields);

                const dataToEncode = fields.map(field => ({
                    name: field.name,
                    type: field.type,
                    value: data[field.name]
                }));

                const encodedData = encoder.encodeData(dataToEncode);
                const eventId = BigInt(Date.now()); // Use timestamp as ID for chaos

                // Fire and forget for simulation speed, or await if we want strict ordering
                // For "Chaos", fire and forget is more fun but might clog. 
                // Let's await to be safe but fast.
                await sdk.streams.set({ eventId, data: encodedData } as any);

                setPacketCount(prev => prev + 1);
                setLastPacketTime(Date.now());

            } catch (error) {
                console.error('Chaos Error:', error);
                // Don't stop on error, it's chaos!
            }
        }, 500);
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
        <div className="space-y-6 p-6 bg-white rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
            {isChaosMode && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 animate-pulse" />
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className={`h-6 w-6 ${isChaosMode ? 'text-red-500 animate-bounce' : 'text-slate-400'}`} />
                    <h2 className="text-2xl font-bold tracking-tight">Traffic Simulator</h2>
                </div>
                <div className="text-sm font-mono text-slate-500">
                    Packets Sent: <span className="font-bold text-slate-900">{packetCount}</span>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Target Schema String</Label>
                <Input
                    placeholder="e.g. uint64 timestamp, int32 value"
                    value={schemaString}
                    onChange={(e) => setSchemaString(e.target.value)}
                    disabled={isChaosMode}
                />
            </div>

            <div className="pt-4">
                <Button
                    onClick={toggleChaos}
                    disabled={!isConnected || !schemaString}
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
