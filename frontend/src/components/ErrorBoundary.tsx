import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { t } from '../i18n/translations';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[Tri-Netra] Component crashed:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-900/5">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center mx-auto mb-5 text-rose-600">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{t('somethingWentWrong')}</h2>
              <p className="text-slate-500 text-xs mb-5">
                {t('componentCrashed')}
              </p>
              {this.state.error && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 text-left">
                  <p className="text-xs text-rose-600 font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="flex gap-2.5 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('tryAgain')}
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 transition-all flex items-center gap-1.5 shadow-sm shadow-sky-600/20"
                >
                  <Shield className="w-3.5 h-3.5" />
                  {t('reloadPage')}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-4">
                Tri-Netra • SIH 2026 • If this persists, check the backend server.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
