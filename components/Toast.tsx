
import React, { useEffect } from 'react';
import { Toast } from '../types';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export const ToastNotification: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-poker-green" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const borders = {
    success: 'border-poker-green/20',
    error: 'border-red-500/20',
    info: 'border-blue-500/20'
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl bg-zinc-900 border ${borders[toast.type]} shadow-2xl min-w-[300px] animate-in slide-in-from-right-full duration-300 relative group`}>
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-white">{toast.title}</h4>
        {toast.description && (
          <p className="text-xs text-zinc-400 mt-1">{toast.description}</p>
        )}
      </div>
      <button 
        onClick={() => onClose(toast.id)}
        className="text-zinc-500 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Progress bar visual */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-20 w-full rounded-full overflow-hidden">
        <div className={`h-full ${toast.type === 'success' ? 'bg-poker-green' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'} animate-[shrink_5s_linear_forwards]`} style={{ width: '100%' }}></div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: Toast[], removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
};
