import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <AlertTriangle size={40} className="text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold text-white">Ops! Algo deu errado</h2>
            <p className="text-slate-400 text-xs max-w-xs mx-auto font-medium">
              Ocorreu um erro inesperado. Tente recarregar o aplicativo.
            </p>
            {this.state.error && (
              <pre className="mt-4 p-3 bg-black/50 rounded-xl text-[10px] text-red-400/70 font-mono text-left overflow-auto max-w-full">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-brand/20 hover:scale-105 transition-all"
          >
            <RefreshCcw size={16} />
            Recarregar App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
