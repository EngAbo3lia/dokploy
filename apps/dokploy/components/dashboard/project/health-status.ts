import type { ProjectHealthStatus } from "@dokploy/server";

export const STATUS_META: Record<
	ProjectHealthStatus,
	{ label: string; badge: string; dot: string; pulse?: boolean }
> = {
	healthy: {
		label: "Healthy",
		badge: "border-success/20 bg-success/10 text-success",
		dot: "bg-success",
	},
	degraded: {
		label: "Degraded",
		badge: "border-warning/20 bg-warning/10 text-warning",
		dot: "bg-warning",
	},
	deploying: {
		label: "Deploying",
		badge: "border-info/20 bg-info/10 text-info",
		dot: "bg-info",
		pulse: true,
	},
	failed: {
		label: "Failed",
		badge: "border-destructive/20 bg-destructive/10 text-destructive",
		dot: "bg-destructive",
	},
	stopped: {
		label: "Stopped",
		badge: "border-border bg-muted text-muted-foreground",
		dot: "bg-muted-foreground/50",
	},
	empty: {
		label: "No services",
		badge: "border-border bg-muted text-muted-foreground",
		dot: "bg-muted-foreground/30",
	},
	unknown: {
		label: "Unknown",
		badge: "border-border bg-muted text-muted-foreground",
		dot: "bg-muted-foreground/40",
	},
};
