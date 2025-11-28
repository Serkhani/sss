'use client';

import React from 'react';
import { Button } from '@/components/ui/simple-ui';
import { ArrowRight, Zap, Activity, Globe } from 'lucide-react';

interface LandingPageProps {
    onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#0B0C15]">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0B0C15] to-[#0B0C15] z-0"></div>
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center space-y-8 max-w-4xl px-4">
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium uppercase tracking-wider mb-4">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                        Somnia Network Testnet
                    </div>
                    <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                        Somnia <br /> Stream Studio
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-400 font-light tracking-wide max-w-2xl mx-auto">
                        The Dream Computer Interface for High-Frequency Data Streams
                    </p>
                </div>

                {/* Project Goal */}
                <div className="max-w-3xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                    <p className="text-lg text-indigo-200/80 italic">
                        "Build a 'Postman-like' GUI for the Somnia Data Streams SDK. It allows developers to visually build schemas, publish data via dynamic forms, simulate high-frequency traffic, and monitor real-time streams without writing code."
                    </p>
                </div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto pt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">

                    {/* For Developers */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                            <Zap className="text-yellow-400" /> For Developers
                        </h3>
                        <div className="grid gap-4">
                            <FeatureCard
                                //icon={<Activity className="h-5 w-5 text-cyan-400" />}
                                title="Rapid Prototyping"
                                description="Test schemas and data flows in seconds, not hours. Iterate faster on Testnet."
                            />
                            <FeatureCard
                                //icon={<Globe className="h-5 w-5 text-indigo-400" />}
                                title="Visual Debugging"
                                description="See exactly what's happening on the wire with real-time inspection and raw data views."
                            />
                        </div>
                    </div>

                    {/* For Newbies */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                            <Activity className="text-emerald-400" /> For Everyone
                        </h3>
                        <div className="grid gap-4">
                            <FeatureCard
                                //icon={<Zap className="h-5 w-5 text-purple-400" />}
                                title="No Code Required"
                                description="Interact with the blockchain using simple forms and visual tools. No CLI needed."
                            />
                            <FeatureCard
                                //icon={<Globe className="h-5 w-5 text-pink-400" />}
                                title="Learn by Doing"
                                description="Understand schemas, streams, and events through hands-on experimentation in a safe sandbox."
                            />
                        </div>
                    </div>
                </div>

                {/* Core Modules Grid */}
                <div className="max-w-6xl mx-auto pt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                    <h3 className="text-2xl font-bold text-white mb-8">Modules</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ModuleCard
                            title="Schema Builder"
                            description="Visually design and register data schemas on the Somnia Network with zero code."
                            color="text-yellow-400"
                        />
                        <ModuleCard
                            title="Dynamic Publisher"
                            description="Publish data manually using auto-generated forms based on your schema."
                            color="text-orange-400"
                        />
                        <ModuleCard
                            title="Traffic Simulator"
                            description="Generate high-frequency chaos traffic to stress-test your stream consumers."
                            color="text-red-400"
                        />
                        <ModuleCard
                            title="Live Monitor"
                            description="Inspect raw stream events and debug data flow with millisecond precision."
                            color="text-emerald-400"
                        />
                        <ModuleCard
                            title="Chainlink Oracle"
                            description="Fetch data from chainlink and stream it to Somnia in real-time."
                            color="text-cyan-400"
                        />
                        <ModuleCard
                            title="Access Control"
                            description="Manage write permissions and secure your data streams on-chain."
                            color="text-purple-400"
                        />
                        <ModuleCard
                            title="Stream Reader"
                            description="Execute raw SDK read methods to query blockchain state directly."
                            color="text-blue-400"
                        />
                        <ModuleCard
                            title="Simulation Lab"
                            description="A combined view for publishing and monitoring streams simultaneously."
                            color="text-pink-400"
                        />
                    </div>
                </div>

                <div className="pt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400 flex flex-col md:flex-row items-center justify-center gap-4">
                    <Button
                        onClick={onEnter}
                        className="h-14 px-10 text-lg bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_50px_rgba(99,102,241,0.5)] transition-all duration-300 border border-indigo-400/30 font-semibold tracking-wide"
                    >
                        Start Building <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
                <div className="mt-8">
                    <p className="text-xs text-slate-500">
                        v0.1.0 Beta • Powered by Somnia Data Streams SDK
                    </p>
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ title, description }: { title: string, description: string }) {
    return (
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm hover:bg-slate-800/40 transition-colors text-left">
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
        </div>
    );
}

function ModuleCard({ title, description, color }: { title: string, description: string, color: string }) {
    return (
        <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/40 hover:bg-slate-800/50 transition-all text-left group">
            <h4 className={`text-sm font-bold mb-1 ${color} group-hover:brightness-125 transition-all`}>{title}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
        </div>
    );
}
