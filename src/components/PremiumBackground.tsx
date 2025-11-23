import React from 'react';

interface PremiumBackgroundProps {
  variant?: 'patient' | 'hospital' | 'ambulance';
  children: React.ReactNode;
}

export const PremiumBackground: React.FC<PremiumBackgroundProps> = ({ 
  variant = 'patient', 
  children 
}) => {
  const getGradientClass = () => {
    switch (variant) {
      case 'patient':
        return 'from-pink-50 via-red-50 to-pink-100 dark:from-pink-950/20 dark:via-red-950/20 dark:to-pink-900/20';
      case 'hospital':
        return 'from-blue-50 via-purple-50 to-blue-100 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-blue-900/20';
      case 'ambulance':
        return 'from-cyan-50 via-teal-50 to-cyan-100 dark:from-cyan-950/20 dark:via-teal-950/20 dark:to-cyan-900/20';
      default:
        return 'from-pink-50 via-red-50 to-pink-100 dark:from-pink-950/20 dark:via-red-950/20 dark:to-pink-900/20';
    }
  };

  const getBlobColors = () => {
    switch (variant) {
      case 'patient':
        return {
          blob1: 'bg-gradient-to-r from-pink-400 to-red-400',
          blob2: 'bg-gradient-to-r from-red-400 to-pink-500',
          blob3: 'bg-gradient-to-r from-pink-500 to-red-500',
        };
      case 'hospital':
        return {
          blob1: 'bg-gradient-to-r from-blue-400 to-purple-400',
          blob2: 'bg-gradient-to-r from-purple-400 to-blue-500',
          blob3: 'bg-gradient-to-r from-blue-500 to-purple-500',
        };
      case 'ambulance':
        return {
          blob1: 'bg-gradient-to-r from-cyan-400 to-teal-400',
          blob2: 'bg-gradient-to-r from-teal-400 to-cyan-500',
          blob3: 'bg-gradient-to-r from-cyan-500 to-teal-500',
        };
    }
  };

  const blobs = getBlobColors();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Gradient Background */}
      <div className={`fixed inset-0 bg-gradient-to-br ${getGradientClass()} transition-colors duration-500`} />
      
      {/* Mesh Gradient Overlay */}
      <div className="fixed inset-0 bg-mesh-gradient opacity-60" />
      
      {/* Animated Blob Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 -left-4 w-96 h-96 ${blobs.blob1} rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-blob`} />
        <div className={`absolute top-0 -right-4 w-96 h-96 ${blobs.blob2} rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-blob animation-delay-2000`} />
        <div className={`absolute -bottom-8 left-20 w-96 h-96 ${blobs.blob3} rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-blob animation-delay-4000`} />
      </div>

      {/* Subtle Grid Pattern */}
      <div className="fixed inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Floating Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-pink-500 dark:bg-pink-400 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Radial Glow Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/10 dark:bg-pink-500/20 rounded-full filter blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 dark:bg-red-500/20 rounded-full filter blur-[100px] animate-pulse-slow animation-delay-2000" />
      </div>

      {/* Content with Glass Effect */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
