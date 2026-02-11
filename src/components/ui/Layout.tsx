import React, { useState } from 'react';
import { useTTSStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Mic, Music, Settings, Sparkles, Volume2, Menu, X } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { mode, setMode } = useTTSStore();

    return (
        <div className="flex h-screen w-full bg-[#fdfbf7] text-stone-800 font-sans selection:bg-rose-200 selection:text-rose-900 overflow-hidden">

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Responsive */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-[#e6e2d8] bg-[#faf9f6] transition-transform duration-300 lg:translate-x-0",
                    sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
                )}
            >
                <div className="h-16 flex items-center justify-between px-6 border-b border-[#e6e2d8]">
                    <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-rose-400/20 flex items-center justify-center text-rose-600">
                            <Sparkles size={18} />
                        </div>
                        <span className="ml-3 font-semibold text-lg tracking-tight text-stone-700">
                            TTSWeb
                        </span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-stone-400 hover:text-stone-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto">
                    <NavItem
                        icon={<Mic />}
                        label="Generate"
                        active={mode === 'custom'}
                        onClick={() => { setMode('custom'); setSidebarOpen(false); }}
                    />
                    <NavItem
                        icon={<Music />}
                        label="Voice Design"
                        active={mode === 'design'}
                        onClick={() => { setMode('design'); setSidebarOpen(false); }}
                    />
                    <NavItem
                        icon={<Volume2 />}
                        label="Cloning"
                        active={mode === 'clone'}
                        onClick={() => { setMode('clone'); setSidebarOpen(false); }}
                    />
                    <div className="flex-1" />
                    <NavItem icon={<Settings />} label="Settings" onClick={() => { }} />
                </nav>

                <div className="p-4 border-t border-[#e6e2d8]">
                    <div className="rounded-xl bg-stone-100 p-3 text-xs text-stone-500">
                        <p>Connected to backend</p>
                        <div className="mt-2 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-medium text-emerald-600">Active</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="h-16 flex items-center px-4 lg:px-8 border-b border-[#e6e2d8] bg-[#fdfbf7]/80 backdrop-blur-md z-10 sticky top-0 justify-between lg:justify-start">

                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden mr-4 text-stone-500 p-2 hover:bg-stone-100 rounded-lg"
                    >
                        <Menu size={20} />
                    </button>

                    <h1 className="text-lg lg:text-xl font-medium text-stone-800 truncate">Quick Generate</h1>

                    <div className="ml-auto flex items-center gap-4">
                        <button className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors">
                            History
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth will-change-transform">
                    <div className="max-w-4xl mx-auto w-full pb-20 lg:pb-0">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium w-full text-left",
                active
                    ? "bg-stone-200/60 text-stone-900 shadow-sm ring-1 ring-black/5"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            )}
        >
            <span className={cn("transition-colors", active ? "text-stone-900" : "text-stone-400 group-hover:text-stone-600")}>
                {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 20 })}
            </span>
            <span>{label}</span>
        </button>
    );
}
