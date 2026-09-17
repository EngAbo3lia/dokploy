import type * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
	title,
	description,
	className,
	children,
}: {
	title: string;
	description?: string;
	className?: string;
	children?: React.ReactNode;
}) {
	return (
		<header className={cn("studio-page-header", className)}>
			<div>
				<h1 className="studio-page-title">{title}</h1>
				{description ? (
					<p className="studio-page-subtitle">{description}</p>
				) : null}
			</div>
			{children ? <div className="studio-row">{children}</div> : null}
		</header>
	);
}
