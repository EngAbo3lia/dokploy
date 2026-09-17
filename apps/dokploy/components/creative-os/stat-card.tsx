import type * as React from "react";
import { cn } from "@/lib/utils";

export function StatGrid({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return <div className={cn("studio-stat-grid", className)}>{children}</div>;
}

export function StatCard({
	label,
	value,
	sub,
	className,
}: {
	label: string;
	value: React.ReactNode;
	sub?: string;
	className?: string;
}) {
	return (
		<div className={cn("studio-stat-card", className)}>
			<span className="studio-stat-label">{label}</span>
			<span className="studio-stat-value">{value}</span>
			{sub ? <span className="studio-stat-sub">{sub}</span> : null}
		</div>
	);
}
