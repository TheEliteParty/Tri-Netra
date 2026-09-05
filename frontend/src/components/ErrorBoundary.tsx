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
    console.error('[GeoShield] Component crashed:', error, errorInfo);
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
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="glass rounded-2xl p-8 border border-red-600/30">
              <div className="w-16 h-16 rounded-2xl bg-red-600/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('somethingWentWrong')}</h2>
              <p className="text-dark-400 text-sm mb-6">
                {t('componentCrashed')}
              </p>
              {this.state.error && (
                <div className="bg-dark-800 rounded-lg p-3 mb-6 text-left">
                  <p className="text-xs text-red-400 font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-dark-300 text-sm font-medium hover:text-white transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('tryAgain')}
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-4 py-2 rounded-lg bg-green-600/20 border border-green-600/30 text-green-400 text-sm font-medium hover:bg-green-600/30 transition-all flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  {t('reloadPage')}
                </button>
              </div>
              <p className="text-[10px] text-dark-500 mt-4">
                GeoShield • SIH 2026 • If this persists, check the backend server.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
