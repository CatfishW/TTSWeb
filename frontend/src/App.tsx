import { Layout } from "@/components/ui/Layout";
import { Generator } from "@/components/features/Generator";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { useEffect, useState } from "react";
import { Sparkles, AudioWaveform, Menu, X } from "lucide-react";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-4">
          <AudioWaveform size={48} className="animate-spin text-[var(--color-primary)]" />
          <p className="text-[var(--color-text-muted)] text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b-2 border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-[var(--color-text)] leading-tight">
                  TTSWeb
                </h1>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Qwen3 Text to Speech
                </p>
              </div>
            </div>

            {/* Desktop Theme Switcher */}
            <div className="hidden md:flex items-center">
              <ThemeSwitcher />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[var(--color-text)] hover:bg-[var(--color-bg-paper)]"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg)]">
            <div className="px-4 py-4">
              <ThemeSwitcher />
            </div>
          </div>
        )}
      </header>

      {/* Main content - with padding for fixed header */}
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Layout>
            <Generator />
          </Layout>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[var(--color-border)] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-[var(--color-text-muted)] text-sm">
            TTSWeb - Powered by Qwen3-TTS
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
