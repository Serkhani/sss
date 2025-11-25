'use client';

import React, { useState } from 'react';
import { useStream } from '../providers/StreamProvider';
import { Button, Input, Label } from '@/components/ui/simple-ui';
import { Search, Database, Code } from 'lucide-react';

const READ_METHODS = [
    'getByKey',
    'getAtIndex',
    'getBetweenRange',
    'getAllPublisherDataForSchema',
    'getLastPublishedDataForSchema',
    'totalPublisherDataForSchema',
    'isDataSchemaRegistered',
    'parentSchemaId',
    'schemaIdToId',
    'idToSchemaId',
    'getAllSchemas',
    'getEventSchemasById',
    'computeSchemaId',
    'getSchemaFromSchemaId',
    'getSomniaDataStreamsProtocolInfo',
    'deserialiseRawData'
];

export default function StreamReader() {
    const { sdk } = useStream();
    const [method, setMethod] = useState(READ_METHODS[0]);
    const [params, setParams] = useState<Record<string, string>>({});
    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleParamChange = (key: string, value: string) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const executeRead = async () => {
        if (!sdk) return;
        setIsLoading(true);
        setResult(null);
        try {
            let res;
            const s = sdk.streams;

            switch (method) {
                case 'getByKey':
                    res = await s.getByKey(params.schemaId as `0x${string}`, params.publisher as `0x${string}`, params.key as `0x${string}`);
                    break;
                case 'getAtIndex':
                    res = await s.getAtIndex(params.schemaId as `0x${string}`, params.publisher as `0x${string}`, BigInt(params.index || 0));
                    break;
                case 'getBetweenRange':
                    res = await s.getBetweenRange(params.schemaId as `0x${string}`, params.publisher as `0x${string}`, BigInt(params.startIndex || 0), BigInt(params.endIndex || 10));
                    break;
                case 'getAllPublisherDataForSchema':
                    res = await s.getAllPublisherDataForSchema({ schemaId: params.schemaId as `0x${string}`, publisher: params.publisher as `0x${string}` } as any, params.publisher as `0x${string}`);
                    break;
                case 'getLastPublishedDataForSchema':
                    res = await s.getLastPublishedDataForSchema(params.schemaId as `0x${string}`, params.publisher as `0x${string}`);
                    break;
                case 'totalPublisherDataForSchema':
                    res = await s.totalPublisherDataForSchema(params.schemaId as `0x${string}`, params.publisher as `0x${string}`);
                    break;
                case 'isDataSchemaRegistered':
                    res = await s.isDataSchemaRegistered(params.schemaId as `0x${string}`);
                    break;
                case 'parentSchemaId':
                    res = await s.parentSchemaId(params.schemaId as `0x${string}`);
                    break;
                case 'schemaIdToId':
                    res = await (s as any).schemaIdToId(params.schemaId as `0x${string}`);
                    break;
                case 'idToSchemaId':
                    res = await (s as any).idToSchemaId(params.id);
                    break;
                case 'getAllSchemas':
                    res = await s.getAllSchemas();
                    break;
                case 'getEventSchemasById':
                    res = await s.getEventSchemasById(params.ids.split(',').map(id => id.trim()));
                    break;
                case 'computeSchemaId':
                    res = await s.computeSchemaId(params.schema);
                    break;
                case 'getSchemaFromSchemaId':
                    res = await s.getSchemaFromSchemaId(params.schemaId as `0x${string}`);
                    break;
                case 'getSomniaDataStreamsProtocolInfo':
                    res = await s.getSomniaDataStreamsProtocolInfo();
                    break;
                case 'deserialiseRawData':
                    // Expecting rawData as comma separated hex strings
                    const rawData = params.rawData.split(',').map(d => d.trim()) as `0x${string}`[];
                    res = await (s as any).deserialiseRawData(rawData, params.parentSchemaId as `0x${string}`, null);
                    break;
                default:
                    res = 'Method not implemented';
            }

            // Handle BigInt serialization
            setResult(JSON.parse(JSON.stringify(res, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            )));

        } catch (error: any) {
            console.error('Read Error:', error);
            setResult({ error: error.message || 'Unknown error' });
        } finally {
            setIsLoading(false);
        }
    };

    const renderInputs = () => {
        switch (method) {
            case 'getByKey':
                return (
                    <>
                        <Input placeholder="Schema ID (Hex)" onChange={e => handleParamChange('schemaId', e.target.value)} />
                        <Input placeholder="Publisher Address" onChange={e => handleParamChange('publisher', e.target.value)} />
                        <Input placeholder="Key (Hex)" onChange={e => handleParamChange('key', e.target.value)} />
                    </>
                );
            case 'getAtIndex':
                return (
                    <>
                        <Input placeholder="Schema ID (Hex)" onChange={e => handleParamChange('schemaId', e.target.value)} />
                        <Input placeholder="Publisher Address" onChange={e => handleParamChange('publisher', e.target.value)} />
                        <Input placeholder="Index (Number)" type="number" onChange={e => handleParamChange('index', e.target.value)} />
                    </>
                );
            case 'getBetweenRange':
                return (
                    <>
                        <Input placeholder="Schema ID (Hex)" onChange={e => handleParamChange('schemaId', e.target.value)} />
                        <Input placeholder="Publisher Address" onChange={e => handleParamChange('publisher', e.target.value)} />
                        <div className="flex gap-2">
                            <Input placeholder="Start Index" type="number" onChange={e => handleParamChange('startIndex', e.target.value)} />
                            <Input placeholder="End Index" type="number" onChange={e => handleParamChange('endIndex', e.target.value)} />
                        </div>
                    </>
                );
            case 'getAllPublisherDataForSchema':
            case 'getLastPublishedDataForSchema':
            case 'totalPublisherDataForSchema':
                return (
                    <>
                        <Input placeholder="Schema ID (Hex)" onChange={e => handleParamChange('schemaId', e.target.value)} />
                        <Input placeholder="Publisher Address" onChange={e => handleParamChange('publisher', e.target.value)} />
                    </>
                );
            case 'isDataSchemaRegistered':
            case 'parentSchemaId':
            case 'schemaIdToId':
            case 'getSchemaFromSchemaId':
                return <Input placeholder="Schema ID (Hex)" onChange={e => handleParamChange('schemaId', e.target.value)} />;
            case 'idToSchemaId':
                return <Input placeholder="ID String (e.g. 'chat')" onChange={e => handleParamChange('id', e.target.value)} />;
            case 'getEventSchemasById':
                return <Input placeholder="Event IDs (comma separated)" onChange={e => handleParamChange('ids', e.target.value)} />;
            case 'computeSchemaId':
                return <Input placeholder="Schema String" onChange={e => handleParamChange('schema', e.target.value)} />;
            case 'deserialiseRawData':
                return (
                    <>
                        <Input placeholder="Raw Data (comma separated hex)" onChange={e => handleParamChange('rawData', e.target.value)} />
                        <Input placeholder="Parent Schema ID (Hex)" onChange={e => handleParamChange('parentSchemaId', e.target.value)} />
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 p-6 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
                <Search className="h-6 w-6 text-slate-900" />
                <h2 className="text-2xl font-bold tracking-tight">Stream Reader</h2>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Select Method</Label>
                    <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                    >
                        {READ_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                <div className="grid gap-4">
                    {renderInputs()}
                </div>

                <Button onClick={executeRead} disabled={isLoading || !sdk} className="w-full">
                    {isLoading ? 'Reading...' : 'Execute Read'}
                </Button>

                <div className="rounded-md bg-slate-950 p-4 min-h-[200px] relative">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-400">Result</span>
                        <Code className="h-4 w-4 text-slate-400" />
                    </div>
                    <pre className="text-sm text-white font-mono overflow-x-auto">
                        {result ? JSON.stringify(result, null, 2) : '// Result will appear here'}
                    </pre>
                </div>
            </div>
        </div>
    );
}
