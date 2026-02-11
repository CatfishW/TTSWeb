import { useTTSStore, type TTSMode } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Mic, Music, Volume2 } from 'lucide-react';

export function ModeSelector() {
    const { mode, setMode } = useTTSStore();

    const modes: { id: TTSMode; label: string; icon: React.ReactNode }[] = [
        { id: 'custom', label: 'Custom Voice', icon: <Mic size={18} /> },
        { id: 'design', label: 'Voice Design', icon: <Music size={18} /> },
        { id: 'clone', label: 'Voice Clone', icon: <Volume2 size={18} /> },
    ];

    return (
        <div className="flex p-1 bg-stone-100 rounded-xl mb-6 w-full lg:w-fit border border-stone-200/50 overflow-x-auto scrollbar-hide">
            {modes.map((m) => (
                <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        mode === m.id
                            ? "bg-white text-stone-800 shadow-sm ring-1 ring-black/5"
                            : "text-stone-500 hover:text-stone-700 hover:bg-stone-200/50"
                    )}
                >
                    {m.icon}
                    {m.label}
                </button>
            ))}
        </div>
    );
}
