'use client';

import React from 'react';
import { X, Copy, Box, Clock, Hash, FileCode } from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';

interface EventDetailModalProps {
    event: any;
    onClose: () => void;
}

export default function EventDetailModal({ event, onClose }: EventDetailModalProps) {
    const toast = useToast();

    if (!event) return null;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied ${label} to clipboard`);
    };

    // Helper to render arguments cleanly
    const renderArgs = (args: any) => {
        if (!args || Object.keys(args).length === 0) return <div className="text-slate-500 italic">No arguments</div>;
        
        return Object.entries(args).map(([key, value]) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded bg-black/40 border border-slate-800/50 mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 sm:mb-0">{key}</span>
                <span className="font-mono text-sm text-green-400 break-all text-right max-w-[70%]">
                    {String(value)}
                </span>
            </div>
        ));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#0B0C15] border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                            {event.name}
                        </h2>
                        <p className="text-sm text-slate-400 font-mono">{event.blockNumber}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Decoded Arguments */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
                            <FileCode className="w-4 h-4 text-indigo-500" />
                            EVENT ARGUMENTS
                        </h3>
                        <div className="bg-slate-900/20 rounded-lg p-1">
                            {renderArgs(event.args)}
                        </div>
                    </section>

                    {/* Metadata */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/50">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                <Box className="w-3 h-3" /> Block Number
                            </div>
                            <div className="font-mono text-white">{event.blockNumber}</div>
                        </div>
                        <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/50">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Timestamp
                            </div>
                            <div className="font-mono text-white">{new Date(event.timestamp).toLocaleString()}</div>
                        </div>
                    </section>

                    {/* Transaction Info */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
                            <Hash className="w-4 h-4 text-indigo-500" />
                            TRANSACTION DETAILS
                        </h3>
                        <div className="group p-4 rounded-lg bg-slate-900/30 border border-slate-800/50 hover:bg-slate-900/50 transition-colors relative">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Transaction Hash</div>
                            <div className="font-mono text-sm text-slate-300 break-all">{event.transactionHash}</div>
                            <button
                                onClick={() => copyToClipboard(event.transactionHash, 'Tx Hash')}
                                className="absolute top-4 right-4 text-slate-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}