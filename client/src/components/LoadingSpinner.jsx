import React from 'react';

const LoadingSpinner = ({
  size = 'md',
  label = 'Loading...',
  fullPage = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative">
        <div
          className={`${sizeClasses[size] || sizeClasses.md} rounded-full border-emerald-500/20 border-t-emerald-400 animate-spin`}
        />
        <div
          className="absolute inset-0 rounded-full blur-md bg-emerald-500/20 pointer-events-none"
        />
      </div>
      {label && (
        <p className="text-sm font-medium text-slate-400 tracking-wide animate-pulse">
          {label}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center w-full">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;
