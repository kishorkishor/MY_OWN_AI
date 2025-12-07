import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-16 h-9 p-1
        transition-all duration-300 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-tertiary)]
        hover:scale-105 active:scale-95
        ${className}
      `}
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-full)',
        boxShadow: 'var(--shadow-neu-raised)',
      }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Currently ${theme} mode. Click to switch.`}
    >
      {/* Sliding indicator - Neumorphic inset */}
      <div
        className="absolute top-1 w-7 h-7 transition-all duration-300 ease-out flex items-center justify-center"
        style={{
          left: isDark ? '4px' : 'calc(100% - 32px)',
          background: 'var(--bg-base)',
          borderRadius: '50%',
          boxShadow: 'var(--shadow-neu-button-pressed)',
        }}
      >
        {isDark ? (
          <Moon 
            size={14} 
            style={{ color: 'var(--text-secondary)' }}
          />
        ) : (
          <Sun 
            size={14} 
            style={{ color: 'var(--text-secondary)' }}
          />
        )}
      </div>

      {/* Background icons */}
      <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
        <Moon 
          size={12} 
          className="transition-opacity duration-300"
          style={{ 
            color: 'var(--text-muted)',
            opacity: isDark ? 0 : 0.5,
          }}
        />
        <Sun 
          size={12} 
          className="transition-opacity duration-300"
          style={{ 
            color: 'var(--text-muted)',
            opacity: isDark ? 0.5 : 0,
          }}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
