import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

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
    error: null,
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">哎呀，出错了</h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            应用程序遇到了一些问题。这可能是暂时的，请尝试刷新页面。
          </p>
          <div className="bg-muted p-4 rounded-md mb-6 max-w-md overflow-auto text-left w-full">
            <p className="font-mono text-xs text-red-500 break-all">
              {this.state.error?.message}
            </p>
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            className="hover-glow"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            刷新页面
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
