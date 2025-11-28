'use client';

import React, { useState } from 'react';
import { useStream } from '../providers/StreamProvider';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { Shield, UserCheck, UserX, Lock } from 'lucide-react';

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
        <div className="space-y-6 p-6 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="h-6 w-6 text-indigo-500" />
                    <h2 className="text-2xl font-bold tracking-tight text-white">Access Control</h2>
                </div>
                <p className="text-sm text-slate-400">
                    Manage write permissions and secure your data streams on-chain.
                </p>
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${isEmitter ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'}`}
                        >
                            <UserCheck className="h-4 w-4" />
                            Grant Access
                        </button>
                        <button
                            onClick={() => setIsEmitter(false)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${!isEmitter ? 'bg-red-900/20 border-red-900/50 text-red-400' : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'}`}
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
