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
    const { sdk, isConnected } = useStream();
    const [eventId, setEventId] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [events, setEvents] = useState<StreamEvent[]>([]);
    const toast = useToast();

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

    const toggleListening = () => {
        if (!isListening && !eventId) {
            toast.error('Please enter an Event ID');
            return;
        }
        setIsListening(!isListening);
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
                    <Button onClick={clearLogs} variant="ghost" className="h-8 w-8 p-0">
                        <Trash className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <p className="text-sm text-slate-400">
                Inspect raw stream events and debug data flow with millisecond precision.
            </p>

            <div className="flex items-end gap-4 flex-none">
                <div className="flex-1 space-y-2">
                    <Label>Event ID to Watch</Label>
                    <Input
                        placeholder="e.g. ChatMessage"
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
                    {isListening ? 'Stop Listening' : 'Start Listening'}
                </Button>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg border-slate-800 bg-black/40 p-4 font-mono text-sm">
                {events.length === 0 ? (
                    <div className="text-slate-500 text-center mt-10">
                        Waiting for events...
                    </div>
                ) : (
                    <div className="space-y-2">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 animate-in fade-in slide-in-from-top-2 duration-300"
                            >
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                                    <span>ID: {event.id}</span>
                                </div>
                                <pre className="overflow-x-auto">
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
