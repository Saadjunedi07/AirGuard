import React from 'react';

interface ToastProps {
  message: string | null;
  icon?: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, icon = 'info' }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#2d3133] text-[#eff1f3] px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 max-w-[90vw] pointer-events-none">
      <span className="material-symbols-outlined text-[#89ceff] text-[20px]">{icon}</span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};
