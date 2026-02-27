import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
                    <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl max-w-2xl w-full">
                        <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong.</h1>
                        <p className="text-slate-300 mb-4">The application crashed. Here is the error details:</p>
                        <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs font-mono text-red-200 mb-4">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors"
                        >
                            Reload Page
                        </button>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            className="ml-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                        >
                            Clear Storage & Reload
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
