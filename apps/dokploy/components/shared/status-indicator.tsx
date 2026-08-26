import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusDotVariants = cva("inline-flex shrink-0 rounded-full", {
	variants: {
		status: {
			running: "h-2 w-2 bg-info animate-pulse",
			success: "h-2 w-2 bg-success",
			deploying: "h-2 w-2 bg-info animate-pulse",
			healthy: "h-2 w-2 bg-success",
			degraded: "h-2 w-2 bg-warning",
			warning: "h-2 w-2 bg-warning",
			error: "h-2 w-2 bg-destructive",
			failed: "h-2 w-2 bg-destructive",
			info: "h-2 w-2 bg-info",
			idle: "h-2 w-2 bg-muted-foreground/50",
			stopped: "h-2 w-2 bg-muted-foreground/30",
			cancelled: "h-2 w-2 bg-muted-foreground/50",
			canceled: "h-2 w-2 bg-muted-foreground/50",
			pending: "h-2 w-2 bg-muted-foreground/30",
			done: "h-2 w-2 bg-success",
		},
		size: {
			sm: "h-1.5 w-1.5",
			md: "h-2 w-2",
			lg: "h-2.5 w-2.5",
		},
	},
	defaultVariants: {
		status: "idle",
		size: "md",
	},
});

function StatusDot({
	status,
	size,
	className,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof statusDotVariants>) {
	return (
		<span
			data-slot="status-dot"
			role="img"
			aria-label={status || "unknown"}
			className={cn(statusDotVariants({ status, size }), className)}
			{...props}
		/>
	);
}

const statusBadgeVariants = cva(
	"inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
	{
		variants: {
			status: {
				running: "bg-info/10 text-info",
				success: "bg-success/10 text-success",
				deploying: "bg-info/10 text-info",
				healthy: "bg-success/10 text-success",
				degraded: "bg-warning/10 text-warning",
				warning: "bg-warning/10 text-warning",
				error: "bg-destructive/10 text-destructive",
				failed: "bg-destructive/10 text-destructive",
				info: "bg-info/10 text-info",
				idle: "bg-muted text-muted-foreground",
				stopped: "bg-muted text-muted-foreground",
				cancelled: "bg-muted text-muted-foreground",
				canceled: "bg-muted text-muted-foreground",
				pending: "bg-muted text-muted-foreground",
				done: "bg-success/10 text-success",
			},
		},
		defaultVariants: {
			status: "idle",
		},
	},
);

function StatusBadge({
	status,
	children,
	className,
	...props
}: React.ComponentProps<"span"> &
	VariantProps<typeof statusBadgeVariants> & { children?: React.ReactNode }) {
	return (
		<span
			data-slot="status-badge"
			className={cn(statusBadgeVariants({ status }), className)}
			{...props}
		>
			<StatusDot status={status} size="sm" />
			{children}
		</span>
	);
}

const deploymentStatusMap: Record<
	string,
	{ status: VariantProps<typeof statusDotVariants>["status"]; label: string }
> = {
	running: { status: "running", label: "Building" },
	done: { status: "done", label: "Deployed" },
	success: { status: "done", label: "Deployed" },
	error: { status: "error", label: "Failed" },
	failed: { status: "error", label: "Failed" },
	cancelled: { status: "cancelled", label: "Cancelled" },
	canceled: { status: "cancelled", label: "Cancelled" },
	queued: { status: "pending", label: "Queued" },
	stopped: { status: "stopped", label: "Stopped" },
};

function DeploymentStatus({ status }: { status: string }) {
	const mapped = deploymentStatusMap[status];
	if (!mapped) {
		return (
			<StatusBadge status="idle">
				{status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
			</StatusBadge>
		);
	}
	return <StatusBadge status={mapped.status}>{mapped.label}</StatusBadge>;
}

export function mapServiceStatus(
	status?: string | null,
): VariantProps<typeof statusDotVariants>["status"] {
	if (!status) {
		return "idle";
	}
	if (["deploying", "starting", "deployed"].includes(status)) {
		return "deploying";
	}
	if (["running", "queueing", "building"].includes(status)) {
		return "deploying";
	}
	if (["healthy", "ready", "done", "success"].includes(status)) {
		return "success";
	}
	if (["degraded", "warning"].includes(status)) {
		return "warning";
	}
	if (["error", "failed", "unhealthy"].includes(status)) {
		return "error";
	}
	if (["stopped", "idle", "cancelled", "canceled"].includes(status)) {
		return "stopped";
	}
	return "idle";
}

export {
	DeploymentStatus,
	StatusBadge,
	StatusDot,
	statusBadgeVariants,
	statusDotVariants,
};
