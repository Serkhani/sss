'use client';

import React, { useState, useEffect } from 'react';
import { useStream } from '../providers/StreamProvider';
import { SchemaField, SUPPORTED_TYPES, generateSchemaString, SchemaType } from '@/lib/utils/schemaParser';
import { Plus, Trash2, Code, Save } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Simple UI Components mimicking shadcn/ui
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'destructive' | 'ghost' }>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variants = {
            default: 'bg-slate-900 text-white hover:bg-slate-900/90',
            outline: 'border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900',
            destructive: 'bg-red-500 text-white hover:bg-red-500/90',
            ghost: 'hover:bg-slate-100 hover:text-slate-900',
        };
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2',
                    variants[variant],
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';

const Select = ({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: string[] }) => (
    <div className="relative">
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
        >
            {options.map((opt) => (
                <option key={opt} value={opt}>
                    {opt}
                </option>
            ))}
        </select>
        {/* Chevron Icon could go here */}
    </div>
);

const Label = ({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props}>
        {children}
    </label>
);

export default function SchemaBuilder() {
    const { sdk, isConnected, connectWallet } = useStream();
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
    useEffect(() => {
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
                    // For events, the ID is the keccak256 hash of the topic, usually handled by viem or similar
                    // But SDK might not have a direct helper for just computing event ID without registering.
                    // However, `registerEventSchemas` takes the ID as input (string name usually, or hash?).
                    // Wait, the SDK `registerEventSchemas` takes `ids: string[]`. 
                    // And `emitEvents` takes `id: string`.
                    // So for events, the "ID" is just the name string (e.g. 'ChatMessage').
                    // But maybe the user wants the TOPIC HASH?
                    // Let's stick to Data Schema ID computation for now as that's what `computeSchemaId` does.
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

    const registerSchema = async () => {
        if (!sdk) return;
        setIsRegistering(true);
        try {
            console.log(`Registering ${schemaType} schema:`, schemaString);
            let tx;

            if (schemaType === 'data') {
                tx = await sdk.streams.registerDataSchemas([
                    {
                        schemaName: schemaName,
                        schema: schemaString,
                        parentSchemaId: (parentSchemaId.trim() || '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`
                    }
                ], true);
            } else {
                // Register Event Schema
                const eventSchema = {
                    params: eventParams.map(p => ({
                        name: p.name,
                        paramType: p.type,
                        isIndexed: p.isIndexed
                    })),
                    eventTopic: schemaString
                };

                tx = await (sdk.streams as any).registerEventSchemas(
                    [eventId],
                    [eventSchema]
                );
            }

            console.log('Transaction:', tx);
            setLastRegisteredId('Check Console for Tx Hash');
            alert('Registration Submitted!');

        } catch (error) {
            console.error('Error registering schema:', error);
            alert('Failed to register schema. See console.');
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className="space-y-6 p-6 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Schema Builder</h2>
                {!isConnected && (
                    <Button onClick={connectWallet} variant="outline">
                        Connect Wallet to Register
                    </Button>
                )}
            </div>

            <div className="flex gap-4 mb-4">
                <button
                    onClick={() => setSchemaType('data')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${schemaType === 'data' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    Data Schema
                </button>
                <button
                    onClick={() => setSchemaType('event')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${schemaType === 'event' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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

            <div className="rounded-md bg-slate-950 p-4 space-y-3">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-400">
                            {schemaType === 'data' ? 'Canonical Schema String' : 'Event Topic'}
                        </span>
                        <Code className="h-4 w-4 text-slate-400" />
                    </div>
                    <code className="text-sm text-white font-mono break-all block">
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

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-sm text-slate-500">
                    {lastRegisteredId && (
                        <span className="text-green-600 font-medium">
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
