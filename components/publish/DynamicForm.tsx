'use client';

import React, { useState, useEffect } from 'react';
import { useStream } from '../providers/StreamProvider';
import { parseSchemaString, SchemaField } from '@/lib/utils/schemaParser';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { SchemaEncoder } from '@somnia-chain/streams';
import { Send, RefreshCw, Lock, Play, Square, LayoutDashboard } from 'lucide-react';
import { useToast } from '../providers/ToastProvider';
import { waitForTransactionReceipt } from 'viem/actions';
import { toHex } from 'viem';

export default function DynamicForm() {
    const { sdk, isConnected, connectWallet, publicClient } = useStream();
    const [schemaString, setSchemaString] = useState('');
    const [fields, setFields] = useState<SchemaField[]>([]);
    const [formData, setFormData] = useState<Record<string, string>>({});

    // Data Stream Config
    const [useRandomId, setUseRandomId] = useState(true);
    const [manualDataId, setManualDataId] = useState('');
    const [manualSchemaId, setManualSchemaId] = useState('');

    // Event Config
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

            // Prepare Data Stream Params
            let dataId: `0x${string}`;
            if (useRandomId) {
                const timestamp = Date.now();
                const idVal = BigInt(timestamp);
                dataId = toHex(`sss-${timestamp}-${idVal}`, { size: 32 });
            } else {
                // Use manual ID, ensure it's hex or convert string to hex if needed? 
                // Assuming user enters Hex for full control, or we convert string.
                // Let's assume Hex if starts with 0x, otherwise string to hex.
                if (manualDataId.startsWith('0x')) {
                    dataId = manualDataId as `0x${string}`;
                } else {
                    // If it's a number string, treat as number? No, "everything" implies raw control.
                    // But for convenience, let's treat as string bytes32 if not 0x.
                    // Actually, toHex from viem handles strings.
                    dataId = toHex(manualDataId, { size: 32 });
                }
            }

            let schemaId: `0x${string}`;
            if (manualSchemaId) {
                schemaId = manualSchemaId as `0x${string}`;
            } else {
                const computed = await sdk.streams.computeSchemaId(schemaString);
                if (computed instanceof Error) throw computed;
                schemaId = computed;
            }

            const dataStream = { id: dataId, schemaId, data: encodedData };
            const topics = argumentTopics.split(',').map(t => t.trim()).filter(t => t.startsWith('0x')) as `0x${string}`[];

            const eventStream = {
                id: eventIdString,
                argumentTopics: topics,
                data: encodedData
            };

            console.log(`Publishing in mode: ${writeMode}`);

            let tx;
            if (writeMode === 'set') {
                tx = await sdk.streams.set([dataStream] as any);
            } else if (writeMode === 'emit') {
                tx = await sdk.streams.emitEvents([eventStream]);
            } else if (writeMode === 'both') {
                tx = await sdk.streams.setAndEmitEvents([dataStream] as any, [eventStream]);
            }

            console.log('Transaction:', tx);

            // Wait for receipt
            if (tx && publicClient) {
                toast.info('Waiting for confirmation...');
                const receipt = await waitForTransactionReceipt(publicClient, { hash: tx as `0x${string}` });
                if (receipt.status === 'success') {
                    toast.success(`Success! TX: ${tx}`);
                } else {
                    toast.error(`Transaction failed! TX: ${tx}`);
                }
            } else {
                toast.success(`Transaction sent: ${tx}`);
            }

        } catch (error: any) {
            console.log('Error publishing data:', error);
            // Extract meaningful error message
            const msg = error.shortMessage || error.message || 'Unknown error';
            toast.error(`Failed: ${msg}`);
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

            <div className="grid gap-6 md:grid-cols-2">
                {/* Data Stream Configuration */}
                {(writeMode === 'set' || writeMode === 'both') && (
                    <div className="space-y-4 p-4 bg-slate-950/30 rounded-lg border border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <Square className="w-4 h-4 text-blue-500" />
                            Data Stream Configuration
                        </h3>
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Data ID (bytes32)</Label>
                                    <button
                                        onClick={() => setUseRandomId(!useRandomId)}
                                        className={`text-xs px-2 py-0.5 rounded border ${useRandomId ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                                    >
                                        {useRandomId ? 'Auto-Generate' : 'Manual Input'}
                                    </button>
                                </div>
                                {useRandomId ? (
                                    <div className="h-10 px-3 py-2 rounded-md border border-slate-800 bg-slate-900/50 text-sm text-slate-500 italic flex items-center">
                                        Auto-generated (Random)
                                    </div>
                                ) : (
                                    <Input
                                        placeholder="0x... or string"
                                        value={manualDataId}
                                        onChange={(e) => setManualDataId(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Schema ID (Optional Override)</Label>
                                <Input
                                    placeholder="Leave empty to compute from Schema String"
                                    value={manualSchemaId}
                                    onChange={(e) => setManualSchemaId(e.target.value)}
                                    className="font-mono text-xs"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Event Configuration */}
                {(writeMode === 'emit' || writeMode === 'both') && (
                    <div className="space-y-4 p-4 bg-slate-950/30 rounded-lg border border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <Play className="w-4 h-4 text-green-500" />
                            Event Configuration
                        </h3>
                        <div className="space-y-3">
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
            </div>

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
                    <h3 className="text-lg font-medium text-slate-200">Data Fields</h3>
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
