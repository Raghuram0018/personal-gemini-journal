import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Verifying architecture...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="relative w-12 h-12 mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin [animation-duration:1.5s]"></div>
      </div>
      <p className="text-sm text-slate-400 font-medium">{message}</p>
    </div>
  );
};
