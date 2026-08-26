import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusDotVariants = cva("inline-flex shrink-0 rounded-full", {
	variants: {
		status: {
			running: "h-2 w-2 bg-success animate-pulse",
			success: "h-2 w-2 bg-success",
			warning: "h-2 w-2 bg-warning",
			error: "h-2 w-2 bg-destructive",
			info: "h-2 w-2 bg-info",
			idle: "h-2 w-2 bg-muted-foreground/50",
			stopped: "h-2 w-2 bg-muted-foreground/30",
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
				running: "bg-success/10 text-success",
				success: "bg-success/10 text-success",
				warning: "bg-warning/10 text-warning",
				error: "bg-destructive/10 text-destructive",
				info: "bg-info/10 text-info",
				idle: "bg-muted text-muted-foreground",
				stopped: "bg-muted text-muted-foreground",
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

function DeploymentStatus({ status }: { status: string }) {
	const mappedStatus = (
		status === "running"
			? "running"
			: status === "success"
				? "success"
				: status === "failed"
					? "error"
					: status === "canceled"
						? "warning"
						: status === "queued"
							? "info"
							: status === "stopped"
								? "stopped"
								: "idle"
	) as VariantProps<typeof statusDotVariants>["status"];

	const label =
		status === "running"
			? "Building"
			: status === "success"
				? "Deployed"
				: status === "failed"
					? "Failed"
					: status === "canceled"
						? "Canceled"
						: status === "queued"
							? "Queued"
							: status === "stopped"
								? "Stopped"
								: status.charAt(0).toUpperCase() + status.slice(1);

	return <StatusBadge status={mappedStatus}>{label}</StatusBadge>;
}

export {
	DeploymentStatus,
	StatusBadge,
	StatusDot,
	statusBadgeVariants,
	statusDotVariants,
};
