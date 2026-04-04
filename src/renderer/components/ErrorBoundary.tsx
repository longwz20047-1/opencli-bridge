import { Component, ErrorInfo, ReactNode } from 'react';
import i18n from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const t = (key: string) => i18n.t(key);
      return (
        <div className="flex items-center justify-center h-screen bg-background text-foreground">
          <div className="text-center max-w-md p-6">
            <h1 className="text-xl font-bold mb-2">{t('somethingWentWrong')}</h1>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || t('unexpectedError')}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
            >
              {t('tryAgain')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
