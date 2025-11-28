'use client';

import React from 'react';
import TrafficSimulator from './TrafficSimulator';
import LiveFeed from '../monitor/LiveFeed';
import { Activity } from 'lucide-react';

export default function SimulationView() {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Activity className="h-6 w-6 text-indigo-500" />
                    <h2 className="text-2xl font-bold tracking-tight text-white">Simulation Lab</h2>
                </div>
                <p className="text-sm text-slate-400">
                    A combined view for publishing and monitoring streams simultaneously.
                </p>
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold mb-2 text-indigo-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        Publisher
                    </h3>
                    <TrafficSimulator />
                </div>
            </div>
            <div className="space-y-6">
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 backdrop-blur-sm h-full">
                    <h3 className="text-lg font-semibold mb-2 text-indigo-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        Subscriber
                    </h3>
                    <LiveFeed />
                </div>
            </div>
        </div>
    );
}
