'use client';

import React, { useState, useEffect } from 'react';
import { useStream } from '../providers/StreamProvider';
import { useToast } from '../providers/ToastProvider';
import { SchemaField, SUPPORTED_TYPES, generateSchemaString, SchemaType } from '@/lib/utils/schemaParser';
import { Plus, Trash2, Save, PenTool, Code } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Button, Input, Label, cn } from '@/components/ui/simple-ui';
import { zeroBytes32 } from '@somnia-chain/streams';

const Select = ({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: string[] }) => (
    <div className="relative">
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 ring-offset-slate-950 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none transition-all shadow-inner"
        >
            {options.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-slate-100">
                    {opt}
                </option>
            ))}
        </select>
    </div>
);

export default function SchemaBuilder() {
    const { sdk, isConnected, connectWallet } = useStream();
    const toast = useToast();
    const [schemaType, setSchemaType] = useState<'data' | 'event'>('data');
    const [fields, setFields] = useState<SchemaField[]>([{ name: 'timestamp', type: 'uint64' }]);
    const [eventParams, setEventParams] = useState<{ name: string, type: string, isIndexed: boolean }[]>([]);
    const [eventId, setEventId] = useState('ChatMessage');
    const [schemaName, setSchemaName] = useState('custom_schema');
    const [parentSchemaId, setParentSchemaId] = useState('');
    const [schemaString, setSchemaString] = useState('');
    const [computedSchemaId, setComputedSchemaId] = useState<string | null>(null);
    const [isSchemaRegistered, setIsSchemaRegistered] = useState<boolean | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [lastRegisteredId, setLastRegisteredId] = useState<string | null>(null);

    useEffect(() => {
        if (schemaType === 'data') {
            setSchemaString(generateSchemaString(fields));
        } else {
            // Generate Event Topic
            const params = eventParams.map(p => `${p.type}${p.isIndexed ? ' indexed' : ''} ${p.name}`).join(', ');
            setSchemaString(`${eventId}(${params})`);
        }
    }, [fields, eventParams, eventId, schemaType]);

    // Compute Schema ID and Check Registration
    const checkSchema = async () => {
        if (!sdk || !schemaString) {
            setComputedSchemaId(null);
            setIsSchemaRegistered(null);
            return;
        }

        try {
            let id;
            if (schemaType === 'data') {
                id = await sdk.streams.computeSchemaId(schemaString);
            } else {
                id = null;
            }

            if (id && !(id instanceof Error)) {
                setComputedSchemaId(id);
                const registered = await sdk.streams.isDataSchemaRegistered(id as `0x${string}`);
                if (typeof registered === 'boolean') {
                    setIsSchemaRegistered(registered);
                } else {
                    setIsSchemaRegistered(null);
                }
            } else {
                setComputedSchemaId(null);
                setIsSchemaRegistered(null);
            }
        } catch (error) {
            console.error('Error checking schema:', error);
            setComputedSchemaId(null);
            setIsSchemaRegistered(null);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(checkSchema, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [schemaString, sdk, schemaType]);

    const addField = () => {
        if (schemaType === 'data') {
            setFields([...fields, { name: '', type: 'string' }]);
        } else {
            setEventParams([...eventParams, { name: '', type: 'bytes32', isIndexed: false }]);
        }
    };

    const removeField = (index: number) => {
        if (schemaType === 'data') {
            const newFields = [...fields];
            newFields.splice(index, 1);
            setFields(newFields);
        } else {
            const newParams = [...eventParams];
            newParams.splice(index, 1);
            setEventParams(newParams);
        }
    };

    const updateField = (index: number, key: keyof SchemaField, value: string) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], [key]: value };
        setFields(newFields);
    };

    const updateEventParam = (index: number, key: string, value: any) => {
        const newParams = [...eventParams];
        (newParams[index] as any)[key] = value;
        setEventParams(newParams);
    };

    const handleRegistrationSuccess = async (tx: any) => {
        console.log('Transaction:', tx);
        if ((tx?.toString() || '').includes('Nothing to register')) {
            setLastRegisteredId('Already Registered');
            toast.info('Schema already registered!');
        } else {
            setLastRegisteredId(`Transaction Submitted: ${tx}`);
            toast.success('Registration Submitted!');
        }
        await checkSchema();
    };

    const handleRegistrationError = async (error: any) => {
        if (error.message && error.message.includes('Nothing to register')) {
            console.log('Schema already registered (idempotent skip).');
            setLastRegisteredId('Already Registered');
            toast.info('Schema already registered!');
            await checkSchema();
        } else {
            console.error('Error registering schema:', error);
            toast.error('Failed to register schema. See console.');
        }
    };

    const registerDataSchema = async () => {
        if (!sdk) return;
        return await sdk.streams.registerDataSchemas([
            {
                schemaName: schemaName,
                schema: schemaString,
                parentSchemaId: parentSchemaId.trim() as `0x${string}` || zeroBytes32
            }
        ], true);
    };

    const registerEventSchema = async () => {
        if (!sdk) return;
        const eventSchema = {
            params: eventParams.map(p => ({
                name: p.name,
                paramType: p.type,
                isIndexed: p.isIndexed
            })),
            eventTopic: schemaString
        };

        return await (sdk.streams as any).registerEventSchemas(
            [eventId],
            [eventSchema]
        );
    };

    const registerSchema = async () => {
        if (!sdk) return;
        setIsRegistering(true);
        try {
            console.log(`Registering ${schemaType} schema:`, schemaString);
            let tx;

            if (schemaType === 'data') {
                tx = await registerDataSchema();
            } else {
                tx = await registerEventSchema();
            }

            await handleRegistrationSuccess(tx);

        } catch (error: any) {
            await handleRegistrationError(error);
        } finally {
            setIsRegistering(false);
        }
        checkSchema();
    };

    return (
        <div className="space-y-6 p-6 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <PenTool className="h-6 w-6 text-indigo-500" />
                    <h2 className="text-2xl font-bold tracking-tight text-white">Schema Builder</h2>
                </div>
                {!isConnected && (
                    <Button onClick={connectWallet} variant="outline">
                        Connect Wallet to Register
                    </Button>
                )}
            </div>
            <p className="text-sm text-slate-400">
                Visually design and register data schemas on the Somnia Network with zero code.
            </p>

            <div className="flex gap-4 mb-4 p-1 bg-slate-950/50 rounded-lg inline-flex border border-slate-800">
                <button
                    onClick={() => setSchemaType('data')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${schemaType === 'data' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                    Data Schema
                </button>
                <button
                    onClick={() => setSchemaType('event')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${schemaType === 'event' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                    Event Schema
                </button>
            </div>

            {schemaType === 'event' ? (
                <div className="space-y-2">
                    <Label>Event ID (Name)</Label>
                    <Input
                        placeholder="e.g. ChatMessage"
                        value={eventId}
                        onChange={(e) => setEventId(e.target.value)}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Schema Name</Label>
                        <Input
                            placeholder="e.g. UserProfile"
                            value={schemaName}
                            onChange={(e) => setSchemaName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Parent Schema ID (Optional)</Label>
                        <Input
                            placeholder="0x... (Leave empty for root schema)"
                            value={parentSchemaId}
                            onChange={(e) => setParentSchemaId(e.target.value)}
                        />
                        <p className="text-xs text-slate-500">
                            Extend an existing schema by providing its ID.
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {schemaType === 'data' ? (
                    fields.map((field, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <Input
                                placeholder="Field Name"
                                value={field.name}
                                onChange={(e) => updateField(index, 'name', e.target.value)}
                                className="flex-1"
                            />
                            <div className="w-[150px]">
                                <Select
                                    value={field.type}
                                    onChange={(val) => updateField(index, 'type', val as SchemaType)}
                                    options={SUPPORTED_TYPES}
                                />
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => removeField(index)}
                                className="text-slate-500 hover:text-red-600 p-2 h-10 w-10"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                ) : (
                    eventParams.map((param, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <Input
                                placeholder="Param Name"
                                value={param.name}
                                onChange={(e) => updateEventParam(index, 'name', e.target.value)}
                                className="flex-1"
                            />
                            <Input
                                placeholder="Type (e.g. bytes32)"
                                value={param.type}
                                onChange={(e) => updateEventParam(index, 'type', e.target.value)}
                                className="w-[150px]"
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={param.isIndexed}
                                    onChange={(e) => updateEventParam(index, 'isIndexed', e.target.checked)}
                                    className="h-4 w-4"
                                />
                                <span className="text-sm text-slate-500">Indexed</span>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => removeField(index)}
                                className="text-slate-500 hover:text-red-600 p-2 h-10 w-10"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>

            <Button onClick={addField} variant="outline" className="w-full border-dashed">
                <Plus className="mr-2 h-4 w-4" /> Add Field
            </Button>

            <div className="rounded-lg bg-black/40 border border-slate-800 p-4 space-y-3 font-mono">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            {schemaType === 'data' ? 'Canonical Schema String' : 'Event Topic'}
                        </span>
                        <Code className="h-4 w-4 text-slate-500" />
                    </div>
                    <code className="text-sm text-cyan-300 break-all block">
                        {schemaString || '// Add fields to generate schema'}
                    </code>
                </div>

                {schemaType === 'data' && computedSchemaId && (
                    <div className="pt-3 border-t border-slate-800">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-400">Computed Schema ID</span>
                            {isSchemaRegistered !== null && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isSchemaRegistered ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                    {isSchemaRegistered ? 'Registered' : 'Not Registered'}
                                </span>
                            )}
                        </div>
                        <code className="text-xs text-slate-300 font-mono break-all block">
                            {computedSchemaId}
                        </code>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="text-sm text-slate-400">
                    {lastRegisteredId && (
                        <span className="text-green-400 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            Last Registered: {lastRegisteredId}
                        </span>
                    )}
                </div>
                <Button
                    onClick={registerSchema}
                    disabled={!isConnected || !schemaString || isRegistering}
                    className="min-w-[150px]"
                >
                    {isRegistering ? 'Registering...' : 'Register Schema'}
                    {!isRegistering && <Save className="ml-2 h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}
