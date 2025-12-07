import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const GradientBackground: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
      {/* Base gradient */}
      <div 
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 50%, #f8fafc 100%)'
        }}
      />
      
      {/* Animated gradient orbs */}
      <div 
        className="absolute w-[800px] h-[800px] rounded-full animate-orb-1"
        style={{
          background: isDark 
            ? 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          top: '-20%',
          left: '-10%',
          filter: 'blur(60px)',
        }}
      />
      
      <div 
        className="absolute w-[600px] h-[600px] rounded-full animate-orb-2"
        style={{
          background: isDark 
            ? 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
          top: '40%',
          right: '-15%',
          filter: 'blur(80px)',
        }}
      />
      
      <div 
        className="absolute w-[500px] h-[500px] rounded-full animate-orb-3"
        style={{
          background: isDark 
            ? 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, transparent 70%)',
          bottom: '-10%',
          left: '30%',
          filter: 'blur(70px)',
        }}
      />

      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: isDark 
            ? 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: isDark 
            ? 'radial-gradient(ellipse at center, transparent 0%, rgba(10, 15, 26, 0.4) 100%)'
            : 'radial-gradient(ellipse at center, transparent 0%, rgba(240, 244, 248, 0.3) 100%)',
        }}
      />

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-particle"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            background: isDark 
              ? `rgba(255, 255, 255, ${Math.random() * 0.1 + 0.05})`
              : `rgba(59, 130, 246, ${Math.random() * 0.15 + 0.05})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 20}s`,
            animationDuration: `${Math.random() * 20 + 20}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes orb-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(50px, 30px) scale(1.05); }
          50% { transform: translate(20px, -20px) scale(0.95); }
          75% { transform: translate(-30px, 20px) scale(1.02); }
        }
        
        @keyframes orb-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, -30px) scale(1.08); }
          66% { transform: translate(30px, 40px) scale(0.92); }
        }
        
        @keyframes orb-float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, -40px) scale(1.1); }
        }

        @keyframes particle-float {
          0%, 100% { 
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { 
            transform: translateY(-100vh) translateX(50px);
            opacity: 0;
          }
        }
        
        .animate-orb-1 {
          animation: orb-float-1 25s ease-in-out infinite;
        }
        
        .animate-orb-2 {
          animation: orb-float-2 30s ease-in-out infinite;
        }
        
        .animate-orb-3 {
          animation: orb-float-3 20s ease-in-out infinite;
        }

        .animate-particle {
          animation: particle-float linear infinite;
        }
      `}</style>
    </div>
  );
};

export default GradientBackground;

