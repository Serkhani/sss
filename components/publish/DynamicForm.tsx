'use client';

import React, { useState, useEffect } from 'react';
import { useStream } from '../providers/StreamProvider';
import { parseSchemaString, SchemaField } from '@/lib/utils/schemaParser';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { SchemaEncoder } from '@somnia-chain/streams';
import { Send, RefreshCw, Lock, Play, Square, LayoutDashboard } from 'lucide-react';
import { useToast } from '../providers/ToastProvider';

export default function DynamicForm() {
    const { sdk, isConnected, connectWallet } = useStream();
    const [schemaString, setSchemaString] = useState('');
    const [fields, setFields] = useState<SchemaField[]>([]);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [useRandomId, setUseRandomId] = useState(true);
    const [fixedId, setFixedId] = useState('1');
    const [writeMode, setWriteMode] = useState<'set' | 'emit' | 'both'>('set');
    const [eventIdString, setEventIdString] = useState('ChatMessage');
    const [argumentTopics, setArgumentTopics] = useState<string>('');
    const [isPublishing, setIsPublishing] = useState(false);
    const toast = useToast();

    useEffect(() => {
        const parsed = parseSchemaString(schemaString);
        setFields(parsed);
        // Reset form data when schema changes
        const initialData: Record<string, string> = {};
        parsed.forEach(f => initialData[f.name] = '');
        setFormData(initialData);
    }, [schemaString]);

    const handleInputChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const publishData = async () => {
        if (!sdk) return;
        setIsPublishing(true);
        try {
            // 1. Encode Data (if needed)
            let encodedData: `0x${string}` = '0x';
            let dataToEncode: any[] = [];

            if (writeMode !== 'emit' || fields.length > 0) {
                const encoder = new SchemaEncoder(schemaString);
                dataToEncode = fields.map(field => {
                    const value = formData[field.name];
                    let typedValue: any = value;

                    if (field.type === 'uint64' || field.type === 'int32') {
                        typedValue = BigInt(value || 0);
                    } else if (field.type === 'bool') {
                        typedValue = value === 'true';
                    }

                    return {
                        name: field.name,
                        type: field.type,
                        value: typedValue
                    };
                });
                encodedData = encoder.encodeData(dataToEncode) as `0x${string}`;
            }

            // 2. Determine ID (for DataStream)
            const dataId = useRandomId ? BigInt(Date.now()) : BigInt(fixedId);

            // 3. Prepare Payloads
            const dataStream = { id: dataId, data: encodedData };

            // Parse argument topics (comma separated hex strings)
            const topics = argumentTopics.split(',').map(t => t.trim()).filter(t => t.startsWith('0x')) as `0x${string}`[];

            const eventStream = {
                id: eventIdString,
                argumentTopics: topics,
                data: encodedData // Using same data for event payload for simplicity in this demo
            };

            console.log(`Publishing in mode: ${writeMode}`);

            let tx;
            if (writeMode === 'set') {
                // sdk.streams.set expects an array of DataStream
                tx = await sdk.streams.set([dataStream] as any);
            } else if (writeMode === 'emit') {
                // sdk.streams.emitEvents expects an array of EventStream
                tx = await sdk.streams.emitEvents([eventStream]);
            } else if (writeMode === 'both') {
                // sdk.streams.setAndEmitEvents expects arrays of both
                tx = await sdk.streams.setAndEmitEvents([dataStream] as any, [eventStream]);
            }

            console.log('Transaction:', tx);
            toast.success(`Success! TX: ${tx}`);

        } catch (error) {
            console.error('Error publishing data:', error);
            toast.error('Failed to publish. See console.');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="space-y-6 p-6 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-6 w-6 text-indigo-500" />
                    <h2 className="text-2xl font-bold tracking-tight text-white">Dynamic Publisher</h2>
                </div>
                {!isConnected && (
                    <Button onClick={connectWallet} variant="outline">
                        Connect Wallet to Publish
                    </Button>
                )}
            </div>
            <p className="text-sm text-slate-400">
                Publish data manually using auto-generated forms based on your schema.
            </p>

            <div className="flex gap-4 mb-4 p-1 bg-slate-950/50 rounded-lg inline-flex border border-slate-800">
                <button
                    onClick={() => setWriteMode('set')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${writeMode === 'set' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                    Set Data
                </button>
                <button
                    onClick={() => setWriteMode('emit')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${writeMode === 'emit' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                    Emit Event
                </button>
                <button
                    onClick={() => setWriteMode('both')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${writeMode === 'both' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                    Set & Emit
                </button>
            </div>

            {(writeMode === 'emit' || writeMode === 'both') && (
                <div className="space-y-4 p-4 bg-slate-950/30 rounded-lg border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300">Event Configuration</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Event ID (String)</Label>
                            <Input
                                placeholder="e.g. ChatMessage"
                                value={eventIdString}
                                onChange={(e) => setEventIdString(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Argument Topics (CSV Hex)</Label>
                            <Input
                                placeholder="0x123..., 0xabc..."
                                value={argumentTopics}
                                onChange={(e) => setArgumentTopics(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label>Data Schema String</Label>
                <Input
                    placeholder="e.g. uint64 timestamp, string message"
                    value={schemaString}
                    onChange={(e) => setSchemaString(e.target.value)}
                />
            </div>

            {fields.length > 0 && (
                <div className="space-y-4 border-t border-slate-800 pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-slate-200">Data Fields</h3>
                        <div className="flex items-center gap-2 text-sm">
                            <button
                                onClick={() => setUseRandomId(!useRandomId)}
                                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${useRandomId ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                            >
                                {useRandomId ? <RefreshCw className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                {useRandomId ? 'Random ID' : 'Fixed ID'}
                            </button>
                            {!useRandomId && (
                                <Input
                                    className="w-20 h-8"
                                    value={fixedId}
                                    onChange={(e) => setFixedId(e.target.value)}
                                    placeholder="ID"
                                />
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {fields.map((field) => (
                            <div key={field.name} className="grid gap-2">
                                <Label className="capitalize">{field.name} <span className="text-slate-400 text-xs font-normal">({field.type})</span></Label>
                                <Input
                                    type={field.type.includes('int') ? 'number' : 'text'}
                                    placeholder={`Enter ${field.name}`}
                                    value={formData[field.name] || ''}
                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    <Button
                        onClick={publishData}
                        disabled={!isConnected || isPublishing}
                        className="w-full"
                    >
                        {isPublishing ? 'Processing...' : writeMode === 'set' ? 'Set Data' : writeMode === 'emit' ? 'Emit Event' : 'Set & Emit'}
                        {!isPublishing && <Send className="ml-2 h-4 w-4" />}
                    </Button>
                </div>
            )}
        </div>
    );
}
