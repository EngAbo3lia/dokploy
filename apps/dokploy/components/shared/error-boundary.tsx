import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onReset?: () => void;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

 componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("[ErrorBoundary]", error, errorInfo);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
		this.props.onReset?.();
	};

	render() {
		const { hasError, error } = this.state;
		const { children, fallback } = this.props;

		if (hasError) {
			if (fallback) {
				return fallback;
			}

			return (
				<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
					<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
						<AlertTriangle className="h-6 w-6" />
					</div>
					<h3 className="text-base font-medium text-foreground">
						Something went wrong
					</h3>
					<p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
						{error?.message || "An unexpected error occurred."}
					</p>
					<Button
						variant="outline"
						size="sm"
						className="mt-5 gap-2"
						onClick={this.handleReset}
					>
						<RefreshCcw className="h-3.5 w-3.5" />
						Try again
					</Button>
				</div>
			);
		}

		return children;
	}
}

export { ErrorBoundary, type ErrorBoundaryProps };
