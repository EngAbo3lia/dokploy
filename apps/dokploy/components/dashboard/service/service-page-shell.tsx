import type * as React from "react";

import { Card } from "@/components/ui/card";

/**
 * Page shell used by all service detail pages.
 *
 * Structure:
 * - Outer Card acts as a frame with `bg-sidebar` and internal padding.
 * - Inner surface is `bg-background` with a subtle shadow.
 *
 * Responsive: outer padding shrinks on mobile so content has more room.
 */
export function ServicePageShell({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={className ?? "w-full"}>
			<Card className="h-full w-full rounded-xl border-0 p-0 lg:p-2.5 bg-transparent lg:bg-sidebar">
				<div className="rounded-xl border bg-background shadow-sm lg:shadow-md">
					{children}
				</div>
			</Card>
		</div>
	);
}
