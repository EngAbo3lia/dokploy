import type * as React from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
	title,
	description,
	actions,
	className,
	bodyClassName,
	children,
}: {
	title?: string;
	description?: string;
	actions?: React.ReactNode;
	className?: string;
	bodyClassName?: string;
	children: React.ReactNode;
}) {
	return (
		<section className={cn("studio-card", className)}>
			{title || actions ? (
				<div className="studio-card-head">
					<div>
						{title ? <h2 className="studio-card-title">{title}</h2> : null}
						{description ? (
							<p className="studio-card-desc">{description}</p>
						) : null}
					</div>
					{actions ? <div className="studio-row">{actions}</div> : null}
				</div>
			) : null}
			<div className={cn("studio-card-body", bodyClassName)}>{children}</div>
		</section>
	);
}
