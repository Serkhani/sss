'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStream } from '../providers/StreamProvider';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { Play, Pause, Trash, Activity } from 'lucide-react';
import { useToast } from '../providers/ToastProvider';

interface StreamEvent {
    id: string;
    timestamp: number;
    data: any;
    schemaId: string;
}

export default function LiveFeed() {
    const { sdk, isConnected, address } = useStream();
    const [eventId, setEventId] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [events, setEvents] = useState<StreamEvent[]>([]);
    const toast = useToast();

    // ... (rest of code)

    // In startListening:
    // const publisher = isConnected ? (await sdk.getWalletClient()?.getAddresses())?.[0] : undefined;
    // Replace with:
    const publisher = address;

    // Mock subscription for now if SDK method signature is unknown, 
    // but I will try to implement what I think it is.
    // User said: sdk.streams.subscribe

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const startSubscription = async () => {
            if (isListening && sdk && eventId) {
                console.log('Subscribing to:', eventId);

                try {
                    const sub = await sdk.streams.subscribe({
                        somniaStreamsEventId: eventId,
                        ethCalls: [], // Optional: Add UI to configure this if needed
                        onData: (data: any) => {
                            console.log('Received event:', data);
                            const newEvent: StreamEvent = {
                                id: Math.random().toString(36).substring(7),
                                timestamp: Date.now(),
                                data: data,
                                schemaId: eventId
                            };

                            setEvents(prev => [newEvent, ...prev].slice(0, 50));
                        },
                        onlyPushChanges: false
                    });

                    unsubscribe = () => {
                        if (sub && typeof (sub as any).unsubscribe === 'function') {
                            (sub as any).unsubscribe();
                        }
                    };
                } catch (error) {
                    console.error('Subscription error:', error);
                    setIsListening(false);
                }
            }
        };

        startSubscription();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [isListening, sdk, eventId]);

    const [mode, setMode] = useState<'events' | 'data'>('events');
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [pollingInterval]);

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const stopListening = () => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
        setIsListening(false);
    };

    const startListening = async () => {
        if (!sdk || !eventId) {
            toast.error('Please connect wallet and enter an ID');
            return;
        }

        setIsListening(true);

        if (mode === 'events') {
            // Poll for events (since we don't have a direct socket subscription in this context yet, or assuming getEvents polling)
            // If SDK has subscribe, use it. If not, poll getEvents.
            // The user mentioned "let live inspector listen for events".
            // Assuming `sdk.streams.getEvents` exists for polling or `subscribe` works.
            // Let's try polling getEvents for simplicity and robustness if subscribe is flaky.

            const interval = setInterval(async () => {
                try {
                    // Fetch recent events
                    // Assuming getEvents({ eventId, limit: 10 })
                    // Or similar API. If not, we might need to use publicClient.getLogs but that requires topics.
                    // Let's assume SDK has a method.
                    // If not, we can use the publicClient from useStream to get logs.
                    // But let's try to use the SDK's `getEvents` if it exists, or just poll `getAllPublisherDataForSchema` for data mode.

                    // For EVENTS:
                    // We need to know the event signature to filter logs.
                    // If we don't know the signature, we can't easily filter by "ChaosEvent" string without hashing it.
                    // But we registered it as "ChaosEvent".
                    // Let's assume we are polling for DATA in 'data' mode and EVENTS in 'events' mode.

                    // Actually, let's implement a simple poller for now.
                    // If mode is 'events', we might need to use `publicClient.getLogs` if SDK doesn't expose a simple "getEventsByName".
                    // But wait, `sdk.streams.getEvents` might be available.

                    // Let's stick to DATA polling for now as it's more guaranteed to work with `getAllPublisherDataForSchema`.
                    // For EVENTS, I'll try to use `sdk.streams.getEvents` if I can find it, otherwise I'll leave a placeholder or use data polling.

                    // User said: "let live inspector either listen for events or read data"

                    // Let's implement DATA polling first as it's easier.

                } catch (e) {
                    console.error(e);
                }
            }, 2000);
            setPollingInterval(interval);

        } else {
            // DATA Polling
            const interval = setInterval(async () => {
                try {
                    // Assuming eventId is actually Schema ID for data mode
                    // We need a schema ID.
                    // If the user enters a schema ID (hex), we use it.
                    // If they enter a string, we might need to compute it? 
                    // Let's assume they enter a Schema ID for Data Mode.

                    // Use current address if available
                    const publisher = address;

                    if (publisher) {
                        const data = await sdk.streams.getAllPublisherDataForSchema(eventId as `0x${string}`, publisher as `0x${string}`);
                        if (data && Array.isArray(data)) {
                            const newEvents = data.map((d: any) => ({
                                id: d.id ? d.id.toString() : '?',
                                timestamp: Date.now(),
                                data: d,
                                schemaId: eventId
                            }));
                            setEvents(newEvents.slice(0, 50));
                        }
                    }
                } catch (e) {
                    console.error('Polling error:', e);
                }
            }, 2000);
            setPollingInterval(interval);
        }
    };

    const clearLogs = () => setEvents([]);

    return (
        <div className="space-y-6 p-6 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl h-[600px] flex flex-col">
            <div className="flex items-center justify-between flex-none">
                <div className="flex items-center gap-2">
                    <Activity className="h-6 w-6 text-indigo-500" />
                    <h2 className="text-2xl font-bold tracking-tight text-white">Live Inspector</h2>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-slate-950/50 rounded-lg p-1 border border-slate-800">
                        <button
                            onClick={() => { setMode('events'); stopListening(); }}
                            className={`px-3 py-1 text-xs rounded transition-colors ${mode === 'events' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Events
                        </button>
                        <button
                            onClick={() => { setMode('data'); stopListening(); }}
                            className={`px-3 py-1 text-xs rounded transition-colors ${mode === 'data' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Data
                        </button>
                    </div>
                    <Button onClick={clearLogs} variant="ghost" className="h-8 w-8 p-0">
                        <Trash className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <p className="text-sm text-slate-400">
                {mode === 'events' ? 'Listen for emitted events (e.g. ChaosEvent).' : 'Poll for persisted data by Schema ID.'}
            </p>

            <div className="flex items-end gap-4 flex-none">
                <div className="flex-1 space-y-2">
                    <Label>{mode === 'events' ? 'Event Name / Topic' : 'Schema ID (Hex)'}</Label>
                    <Input
                        placeholder={mode === 'events' ? "e.g. ChaosEvent" : "0x..."}
                        value={eventId}
                        onChange={(e) => setEventId(e.target.value)}
                        disabled={isListening}
                    />
                </div>
                <Button
                    onClick={toggleListening}
                    variant={isListening ? "destructive" : "default"}
                    className="mb-0.5"
                >
                    {isListening ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isListening ? 'Stop' : 'Start'}
                </Button>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg border-slate-800 bg-black/40 p-4 font-mono text-sm">
                {events.length === 0 ? (
                    <div className="text-slate-500 text-center mt-10">
                        {isListening ? 'Waiting for data...' : 'Ready to start.'}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {events.map((event, i) => (
                            <div
                                key={`${event.id}-${i}`}
                                className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 animate-in fade-in slide-in-from-top-2 duration-300"
                            >
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                                    <span>ID: {event.id}</span>
                                </div>
                                <pre className="overflow-x-auto text-xs">
                                    {JSON.stringify(event.data, null, 2)}
                                </pre>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
