'use client';

import React, { useState } from 'react';
import { useStream } from '../providers/StreamProvider';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { Shield, UserCheck, UserX } from 'lucide-react';

export default function AccessControl() {
    const { sdk, isConnected, connectWallet } = useStream();
    const [eventId, setEventId] = useState('');
    const [emitterAddress, setEmitterAddress] = useState('');
    const [isEmitter, setIsEmitter] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const manageEmitter = async () => {
        if (!sdk) return;
        setIsProcessing(true);
        try {
            console.log(`Managing emitter: ${emitterAddress} for event ${eventId} -> ${isEmitter}`);

            const tx = await sdk.streams.manageEventEmittersForRegisteredStreamsEvent(
                eventId,
                emitterAddress as `0x${string}`,
                isEmitter
            );

            console.log('Transaction:', tx);
            alert(`Success! TX: ${tx}`);

        } catch (error) {
            console.error('Error managing emitter:', error);
            alert('Failed to manage emitter. See console.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 p-6 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="h-6 w-6 text-slate-900" />
                    <h2 className="text-2xl font-bold tracking-tight">Access Control</h2>
                </div>
                {!isConnected && (
                    <Button onClick={connectWallet} variant="outline">
                        Connect Wallet
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Event ID (Name)</Label>
                    <Input
                        placeholder="e.g. ChatMessage"
                        value={eventId}
                        onChange={(e) => setEventId(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Emitter Address</Label>
                    <Input
                        placeholder="0x..."
                        value={emitterAddress}
                        onChange={(e) => setEmitterAddress(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsEmitter(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${isEmitter ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                            <UserCheck className="h-4 w-4" />
                            Grant Access
                        </button>
                        <button
                            onClick={() => setIsEmitter(false)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${!isEmitter ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                            <UserX className="h-4 w-4" />
                            Revoke Access
                        </button>
                    </div>
                </div>

                <Button
                    onClick={manageEmitter}
                    disabled={!isConnected || !eventId || !emitterAddress || isProcessing}
                    className="w-full"
                >
                    {isProcessing ? 'Processing...' : isEmitter ? 'Grant Permission' : 'Revoke Permission'}
                </Button>
            </div>
        </div>
    );
}
