'use client';

import React, { useState } from 'react';
import { StreamProvider } from '@/components/providers/StreamProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import SchemaBuilder from '@/components/schema/SchemaBuilder';
import DynamicForm from '@/components/publish/DynamicForm';
import TrafficSimulator from '@/components/publish/TrafficSimulator';
import LiveFeed from '@/components/monitor/LiveFeed';
import { LayoutDashboard, PenTool, Radio, Activity } from 'lucide-react';
import AccessControl from '@/components/manage/AccessControl';
import StreamReader from '@/components/read/StreamReader';

import SimulationView from '@/components/publish/SimulationView';
import UniversalBot from '@/components/bots/UniversalBot';
import LandingPage from '@/components/landing/LandingPage';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'schema' | 'publish' | 'simulate' | 'monitor' | 'access-control' | 'reader' | 'combined' | 'bot'>('schema');
  const [showLanding, setShowLanding] = useState(true);

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return (
    <StreamProvider>
      <ToastProvider>
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B0C15] to-[#0B0C15] text-slate-200 font-sans selection:bg-indigo-500/30">
          {/* Header */}
          <header className="border-b border-slate-800/60 sticky top-0 z-10 backdrop-blur-md bg-[#0B0C15]/70">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                  S
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-white">Somnia Stream Studio</h1>
                  <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Dream Computer Interface</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800 text-xs font-mono text-slate-400">
                  v0.1.0 Beta
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Sidebar Navigation */}
              <div className="lg:col-span-3 space-y-2">
                <div className="mb-4 px-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Core Modules</h3>
                </div>
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
                  active={activeTab === 'bot'}
                  onClick={() => setActiveTab('bot')}
                  icon={<Activity className="w-4 h-4" />}
                  label="Universal Oracle"
                  description="Any Chain, Any Data"
                />

                <div className="mt-6 mb-2 px-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Simulation & Monitor</h3>
                </div>
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
                <NavButton
                  active={activeTab === 'combined'}
                  onClick={() => setActiveTab('combined')}
                  icon={<Activity className="w-4 h-4" />}
                  label="Simulation Lab"
                  description="Pub/Sub Combined View"
                />

                <div className="mt-6 mb-2 px-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Governance</h3>
                </div>
                <NavButton
                  active={activeTab === 'access-control'}
                  onClick={() => setActiveTab('access-control')}
                  icon={<Radio className="w-4 h-4" />}
                  label="Access Control"
                  description="Manage Emitter Permissions"
                />
                <NavButton
                  active={activeTab === 'reader'}
                  onClick={() => setActiveTab('reader')}
                  icon={<Radio className="w-4 h-4" />}
                  label="Reader"
                  description="Manage Reader Permissions"
                />
              </div>

              {/* Content Area */}
              <div className="lg:col-span-9">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {activeTab === 'schema' && <SchemaBuilder />}
                  {activeTab === 'publish' && <DynamicForm />}
                  {activeTab === 'simulate' && <TrafficSimulator />}
                  {activeTab === 'monitor' && <LiveFeed />}
                  {activeTab === 'combined' && <SimulationView />}
                  {activeTab === 'bot' && <UniversalBot />}
                  {activeTab === 'access-control' && <AccessControl />}
                  {activeTab === 'reader' && <StreamReader />}
                </div>
              </div>
            </div>
          </main>
        </div>
      </ToastProvider>
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
      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${active
        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
        : 'bg-transparent border-transparent hover:bg-slate-800/50 hover:border-slate-700'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg transition-colors ${active ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'}`}>
          {icon}
        </div>
        <div>
          <div className={`font-medium text-sm ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
            {label}
          </div>
          <div className={`text-xs ${active ? 'text-indigo-200' : 'text-slate-500 group-hover:text-slate-400'}`}>
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}
