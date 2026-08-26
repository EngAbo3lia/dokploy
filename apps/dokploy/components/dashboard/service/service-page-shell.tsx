import type * as React from "react";

import { Card } from "@/components/ui/card";

export function ServicePageShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="w-full">
			<Card className="h-full w-full rounded-xl bg-sidebar p-2.5">
				<div className="rounded-xl bg-background shadow-md">{children}</div>
			</Card>
		</div>
	);
}
