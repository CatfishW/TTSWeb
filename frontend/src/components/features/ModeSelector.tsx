import { useTTSStore, type TTSMode } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Mic, Music, Volume2, FileCode } from 'lucide-react';

export function ModeSelector() {
    const { mode, setMode } = useTTSStore();

    const modes: { id: TTSMode; label: string; icon: React.ReactNode; shortLabel: string }[] = [
        { id: 'custom', label: 'Custom Voice', shortLabel: 'Custom', icon: <Mic size={18} /> },
        { id: 'design', label: 'Voice Design', shortLabel: 'Design', icon: <Music size={18} /> },
        { id: 'clone', label: 'Voice Clone', shortLabel: 'Clone', icon: <Volume2 size={18} /> },
        { id: 'tokenizer', label: 'Tokenizer', shortLabel: 'Tokens', icon: <FileCode size={18} /> },
    ];

    return (
        <div className="w-full overflow-x-auto pb-1 -mx-1 px-1">
            <div className="flex gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-[var(--color-bg-paper)] rounded-xl border-2 border-[var(--color-border)] min-w-fit">
                {modes.map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={cn(
                            "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap flex-shrink-0",
                            "hover:scale-105 active:scale-95",
                            mode === m.id
                                ? "bg-[var(--color-primary)] text-white shadow-md ring-2 ring-[var(--color-primary)]/30"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                        )}
                    >
                        <span className="flex-shrink-0">{m.icon}</span>
                        <span className="hidden sm:inline">{m.label}</span>
                        <span className="sm:hidden">{m.shortLabel}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
