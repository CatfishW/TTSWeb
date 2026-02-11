import { useEffect, useState } from 'react';
import { Sun, Moon, Pencil } from 'lucide-react';

export type Theme = 'light' | 'dark' | 'sketch';

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  sketch: Pencil,
};

const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  sketch: 'Sketch',
};

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first, then system preference, default to sketch
    const saved = localStorage.getItem('tts-theme') as Theme;
    if (saved) return saved;

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'sketch';
  });

  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tts-theme', theme);
  }, [theme]);

  const handleThemeChange = (newTheme: Theme) => {
    if (newTheme === theme) return;

    setIsAnimating(true);

    // Add transition class
    document.documentElement.classList.add('theme-transitioning');

    setTimeout(() => {
      setTheme(newTheme);
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
        setIsAnimating(false);
      }, 400);
    }, 100);
  };

  return (
    <div className="theme-switcher" role="group" aria-label="Theme selector">
      {(Object.keys(THEME_ICONS) as Theme[]).map((t) => {
        const Icon = THEME_ICONS[t];
        const isActive = theme === t;

        return (
          <button
            key={t}
            onClick={() => handleThemeChange(t)}
            className={`theme-btn ${t} ${isActive ? 'active' : ''} ${isAnimating ? 'animating' : ''}`}
            aria-label={`Switch to ${THEME_LABELS[t]} theme`}
            aria-pressed={isActive}
            title={THEME_LABELS[t]}
          >
            <Icon
              size={16}
              className={`theme-icon ${isActive ? 'active' : ''}`}
              strokeWidth={2.5}
            />
          </button>
        );
      })}
    </div>
  );
}
