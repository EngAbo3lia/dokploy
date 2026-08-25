import type { ProjectHealthStatus } from "@dokploy/server";

export const STATUS_META: Record<
	ProjectHealthStatus,
	{ label: string; badge: string; dot: string; pulse?: boolean }
> = {
	healthy: {
		label: "Healthy",
		badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
		dot: "bg-emerald-500",
	},
	degraded: {
		label: "Degraded",
		badge: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
		dot: "bg-amber-500",
	},
	deploying: {
		label: "Deploying",
		badge: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
		dot: "bg-blue-500",
		pulse: true,
	},
	failed: {
		label: "Failed",
		badge: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
		dot: "bg-red-500",
	},
	stopped: {
		label: "Stopped",
		badge: "border-border bg-muted/40 text-muted-foreground",
		dot: "bg-muted-foreground/50",
	},
	empty: {
		label: "No services",
		badge: "border-border bg-muted/40 text-muted-foreground",
		dot: "bg-muted-foreground/30",
	},
	unknown: {
		label: "Unknown",
		badge: "border-border bg-muted/40 text-muted-foreground",
		dot: "bg-muted-foreground/40",
	},
};
