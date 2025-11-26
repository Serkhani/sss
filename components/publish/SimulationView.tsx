'use client';

import React from 'react';
import TrafficSimulator from './TrafficSimulator';
import LiveFeed from '../monitor/LiveFeed';

export default function SimulationView() {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-6">
                <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
                    <h3 className="text-lg font-semibold mb-2 text-slate-700">Publisher</h3>
                    <TrafficSimulator />
                </div>
            </div>
            <div className="space-y-6">
                <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 h-full">
                    <h3 className="text-lg font-semibold mb-2 text-slate-700">Subscriber</h3>
                    <LiveFeed />
                </div>
            </div>
        </div>
    );
}
