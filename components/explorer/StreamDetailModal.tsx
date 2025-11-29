'use client';

import React from 'react';
import { X, Copy, Check, Box, Clock, FileJson, Hash, User, Activity } from 'lucide-react';
import { Button } from '@/components/ui/simple-ui';
import { useToast } from '@/components/providers/ToastProvider';

interface StreamDetailModalProps {
    stream: any;
    onClose: () => void;
}

export default function StreamDetailModal({ stream, onClose }: StreamDetailModalProps) {
    const toast = useToast();

    if (!stream) return null;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied ${label} to clipboard`);
    };

    const DetailRow = ({ label, value, copyable = false, icon: Icon }: { label: string, value: string, copyable?: boolean, icon?: any }) => (
        <div className="group p-4 rounded-lg bg-slate-900/30 border border-slate-800/50 hover:bg-slate-900/50 transition-colors">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    {Icon && <Icon className="w-3 h-3" />}
                    {label}
                </span>
                {copyable && (
                    <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(value, label); }}
                        className="text-slate-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                )}
            </div>
            <div className="font-mono text-sm text-slate-200 break-all">
                {value}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-[#0B0C15] border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-orange-500 mb-1">{stream.name}</h2>
                        <p className="text-sm text-slate-400">Stream Details</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Basic Info */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-indigo-500" />
                            BASIC INFORMATION
                        </h3>
                        <div className="grid gap-3">
                            <DetailRow label="Schema ID" value={stream.id} copyable />
                            <DetailRow label="Schema Name" value={stream.name} copyable />
                            <DetailRow label="Publisher Address" value={stream.publisher} copyable icon={User} />
                            <DetailRow label="Transaction Hash" value={stream.txHash || 'N/A'} copyable />
                        </div>
                    </section >

                    {/* Blockchain Info */ }
                    < section className = "space-y-3" >
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Box className="w-4 h-4 text-indigo-500" />
                            BLOCKCHAIN INFORMATION
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <DetailRow label="Block Number" value={stream.block} icon={Box} />
                            <DetailRow label="Timestamp" value={stream.fullDate || stream.created} icon={Clock} />
                        </div>
                    </section >

                    {/* Metadata */ }
                    < section className = "space-y-3" >
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-500" />
                            METADATA
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/50">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Public Schema</div>
                                <div className="flex items-center gap-2 text-green-400 font-medium">
                                    <Check className="w-4 h-4" /> Yes
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/50">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Usage Count</div>
                                <div className="text-xl font-bold text-white">{stream.usage}</div>
                            </div>
                        </div>
                    </section >

                    {/* Schema Definition */ }
                    < section className = "space-y-3" >
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <FileJson className="w-4 h-4 text-indigo-500" />
                            SCHEMA DEFINITION
                        </h3>
                        <div className="relative group">
                            <pre className="p-4 rounded-lg bg-black/50 border border-slate-800 text-sm font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
                                {stream.schemaDefinition || stream.raw?.schema || 'No definition available'}
                            </pre>
                            <button
                                onClick={() => copyToClipboard(stream.schemaDefinition || stream.raw?.schema || '', 'Schema Definition')}
                                className="absolute top-3 right-3 p-2 rounded bg-slate-800/50 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </section >
                </div >
            </div >
        </div >
    );
}
