import type * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
	icon,
	title,
	text,
	action,
	className,
}: {
	icon?: React.ReactNode;
	title?: string;
	text?: string;
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("studio-empty", className)}>
			{icon ? <div className="studio-empty-icon">{icon}</div> : null}
			{title ? <p className="studio-empty-title">{title}</p> : null}
			{text ? <p className="studio-empty-text">{text}</p> : null}
			{action}
		</div>
	);
}
