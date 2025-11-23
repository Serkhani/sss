'use client';

import React, { useState } from 'react';
import { StreamProvider } from '@/components/providers/StreamProvider';
import SchemaBuilder from '@/components/schema/SchemaBuilder';
import DynamicForm from '@/components/publish/DynamicForm';
import TrafficSimulator from '@/components/publish/TrafficSimulator';
import LiveFeed from '@/components/monitor/LiveFeed';
import { LayoutDashboard, PenTool, Radio, Activity } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'schema' | 'publish' | 'simulate' | 'monitor'>('schema');

  return (
    <StreamProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                S
              </div>
              <h1 className="text-xl font-bold tracking-tight">Somnia Stream Studio</h1>
            </div>
            <div className="text-sm text-slate-500">
              v0.1.0 Beta
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Sidebar Navigation */}
            <div className="lg:col-span-3 space-y-2">
              <NavButton
                active={activeTab === 'schema'}
                onClick={() => setActiveTab('schema')}
                icon={<PenTool className="w-4 h-4" />}
                label="Schema Builder"
                description="Design & Register Schemas"
              />
              <NavButton
                active={activeTab === 'publish'}
                onClick={() => setActiveTab('publish')}
                icon={<LayoutDashboard className="w-4 h-4" />}
                label="Dynamic Publisher"
                description="Manual Data Entry"
              />
              <NavButton
                active={activeTab === 'simulate'}
                onClick={() => setActiveTab('simulate')}
                icon={<Activity className="w-4 h-4" />}
                label="Traffic Simulator"
                description="High-Freq Chaos Mode"
              />
              <NavButton
                active={activeTab === 'monitor'}
                onClick={() => setActiveTab('monitor')}
                icon={<Radio className="w-4 h-4" />}
                label="Live Inspector"
                description="Real-time Stream Feed"
              />
            </div>

            {/* Content Area */}
            <div className="lg:col-span-9">
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'schema' && <SchemaBuilder />}
                {activeTab === 'publish' && <DynamicForm />}
                {activeTab === 'simulate' && <TrafficSimulator />}
                {activeTab === 'monitor' && <LiveFeed />}
              </div>
            </div>
          </div>
        </main>
      </div>
    </StreamProvider>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  description
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${active
          ? 'bg-white border-indigo-600 shadow-md ring-1 ring-indigo-600'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
          {icon}
        </div>
        <div>
          <div className={`font-medium ${active ? 'text-indigo-900' : 'text-slate-900'}`}>
            {label}
          </div>
          <div className="text-xs text-slate-500">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}
