import type * as React from "react";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
	value: T;
	label: React.ReactNode;
}

interface SegmentedProps<T extends string> {
	options: readonly SegmentedOption<T>[];
	value: T;
	onValueChange: (value: T) => void;
	className?: string;
}

function Segmented<T extends string>({
	options,
	value,
	onValueChange,
	className,
}: SegmentedProps<T>) {
	return (
		<div
			role="tablist"
			className={cn(
				"inline-flex items-center gap-1 rounded-full bg-muted p-1",
				className,
			)}
		>
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						role="tab"
						aria-selected={active}
						data-state={active ? "active" : "inactive"}
						onClick={() => onValueChange(option.value)}
						className={cn(
							"h-8 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-all duration-150 select-none",
							active
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}

export { Segmented };
