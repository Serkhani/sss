import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 3000, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            setIsVisible(false);
            // Wait for exit animation to finish before removing
            setTimeout(() => onClose(id), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, id, onClose]);

    const icons = {
        success: <CheckCircle className="h-5 w-5 text-green-400" />,
        error: <AlertCircle className="h-5 w-5 text-red-400" />,
        info: <Info className="h-5 w-5 text-cyan-400" />,
    };

    const styles = {
        success: 'bg-slate-900/90 border-green-900/50 shadow-[0_0_15px_rgba(74,222,128,0.1)]',
        error: 'bg-slate-900/90 border-red-900/50 shadow-[0_0_15px_rgba(248,113,113,0.1)]',
        info: 'bg-slate-900/90 border-cyan-900/50 shadow-[0_0_15px_rgba(34,211,238,0.1)]',
    };

    return (
        <div
            className={`
                flex items-center gap-3 p-4 rounded-lg border w-80 transition-all duration-300 transform backdrop-blur-md
                ${styles[type]}
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
            `}
            role="alert"
        >
            <div className="flex-shrink-0">{icons[type]}</div>
            <div className="flex-1 text-sm font-medium text-slate-200">{message}</div>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onClose(id), 300);
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};
