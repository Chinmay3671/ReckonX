import React from 'react';
import { useNavigationContext } from '../context/NavigationContext';
import { CheckCircle2 } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useNavigationContext();

  if (!toast.show) return null;

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-md border border-slate-800 flex items-center gap-2 max-w-[90vw]">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
      <span>{toast.message}</span>
    </div>
  );
};
