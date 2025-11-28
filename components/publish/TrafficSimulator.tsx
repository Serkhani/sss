'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStream } from '../providers/StreamProvider';
import { parseSchemaString, SchemaField } from '@/lib/utils/schemaParser';
import { generateRandomData } from '@/lib/utils/randomizer';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { SchemaEncoder } from '@somnia-chain/streams';
import { Zap, Activity, StopCircle } from 'lucide-react';
import { useToast } from '../providers/ToastProvider';
import { toHex, Hex } from 'viem';

export default function TrafficSimulator() {
    const { sdk, isConnected } = useStream();
    const [schemaString, setSchemaString] = useState('');
    const [isChaosMode, setIsChaosMode] = useState(false);
    const [packetCount, setPacketCount] = useState(0);
    const [lastPacketTime, setLastPacketTime] = useState<number | null>(null);
    const toast = useToast();

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const toggleChaos = () => {
        if (isChaosMode) {
            stopChaos();
        } else {
            startChaos();
        }
    };

    const startChaos = async () => {
        if (!sdk || !schemaString) {
            toast.error('Please connect wallet and enter a valid schema string.');
            return;
        }
        setIsChaosMode(true);

        const fields = parseSchemaString(schemaString);
        const encoder = new SchemaEncoder(schemaString);

        // Pre-compute schema ID and register if needed
        let schemaId: `0x${string}` | undefined;
        try {
            const computedId = await sdk.streams.computeSchemaId(schemaString);
            if (computedId instanceof Error) throw computedId;
            schemaId = computedId;
            // Try to register (ignore if exists)
            await sdk.streams.registerDataSchemas([{
                schemaName: `chaos-${Date.now()}`,
                schema: schemaString,
                parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000'
            }], true);
        } catch (e) {
            toast.info('Registration warning: Schema already registered');
        }

        if (!schemaId) {
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
                const idVal = BigInt(Date.now());
                const dataId = toHex(`chaos-${idVal}`, { size: 32 });

                // Publish
                await sdk.streams.set([{
                    id: dataId,
                    schemaId: schemaId as `0x${string}`,
                    data: encodedData
                }]);

                setPacketCount(prev => prev + 1);
                setLastPacketTime(Date.now());

            } catch (error) {
                toast.error(`Chaos Error: ${error}`);
            }
        }, 2000); // Slow down slightly to avoid nonce issues if wallet is slow
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
                </div>
                <div className="text-sm font-mono text-slate-500">
                    Packets Sent: <span className="font-bold text-slate-200">{packetCount}</span>
                </div>
            </div>
            <p className="text-sm text-slate-400 -mt-4">
                Generate high-frequency chaos traffic to stress-test your stream consumers.
            </p>

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
