import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
	items,
	value,
	onChange,
	className,
}: {
	items: { value: T; label: string; count?: number }[];
	value: T;
	onChange: (value: T) => void;
	className?: string;
}) {
	return (
		<div className={cn("apple-segmented", className)} role="tablist">
			{items.map((item) => (
				<button
					key={item.value}
					type="button"
					role="tab"
					aria-selected={item.value === value}
					className={cn(
						"studio-segment",
						item.value === value && "active",
					)}
					onClick={() => onChange(item.value)}
				>
					{item.label}
					{typeof item.count === "number" ? (
						<span className="studio-font-mono text-[11px] opacity-70">
							{item.count}
						</span>
					) : null}
				</button>
			))}
		</div>
	);
}
