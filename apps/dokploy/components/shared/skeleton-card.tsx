import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton-card"
			className={cn(
				"rounded-xl bg-card ring-1 ring-foreground/10 p-6 space-y-4",
				className,
			)}
			{...props}
		>
			<div className="flex items-center gap-3">
				<Skeleton className="h-10 w-10 rounded-lg" />
				<div className="space-y-2 flex-1">
					<Skeleton className="h-4 w-1/3" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			</div>
			<Skeleton className="h-3 w-full" />
			<Skeleton className="h-3 w-2/3" />
		</div>
	);
}

function SkeletonStat({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton-stat"
			className={cn(
				"rounded-xl bg-card ring-1 ring-foreground/10 p-5 space-y-3",
				className,
			)}
			{...props}
		>
			<Skeleton className="h-3 w-1/2" />
			<Skeleton className="h-7 w-1/3" />
			<div className="flex gap-2">
				<Skeleton className="h-5 w-16 rounded-full" />
				<Skeleton className="h-5 w-20 rounded-full" />
			</div>
		</div>
	);
}

function SkeletonTable({
	rows = 5,
	className,
	...props
}: React.ComponentProps<"div"> & { rows?: number }) {
	return (
		<div
			data-slot="skeleton-table"
			className={cn(
				"rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden",
				className,
			)}
			{...props}
		>
			<div className="flex gap-4 p-4 border-b border-border">
				<Skeleton className="h-4 w-1/4" />
				<Skeleton className="h-4 w-1/6" />
				<Skeleton className="h-4 w-1/6" />
				<Skeleton className="h-4 w-1/4 ml-auto" />
			</div>
			{Array.from({ length: rows }).map((_, i) => (
				<div
					// biome-ignore lint/suspiciousNoArrayIndexKey: skeleton rows are static
					key={`skeleton-row-${i}`}
					className="flex gap-4 p-4 border-b border-border/50 last:border-0"
				>
					<Skeleton className="h-4 w-1/4" />
					<Skeleton className="h-4 w-1/6" />
					<Skeleton className="h-4 w-1/6" />
					<Skeleton className="h-4 w-1/4 ml-auto" />
				</div>
			))}
		</div>
	);
}

function SkeletonProjectCard({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton-project-card"
			className={cn(
				"rounded-xl bg-card ring-1 ring-foreground/10 p-5 space-y-3",
				className,
			)}
			{...props}
		>
			<div className="flex items-center gap-3">
				<Skeleton className="h-8 w-8 rounded-lg" />
				<div className="space-y-2 flex-1">
					<Skeleton className="h-4 w-2/3" />
					<Skeleton className="h-3 w-1/3" />
				</div>
			</div>
			<div className="flex gap-2">
				<Skeleton className="h-5 w-14 rounded-full" />
				<Skeleton className="h-5 w-14 rounded-full" />
				<Skeleton className="h-5 w-14 rounded-full" />
			</div>
			<Skeleton className="h-3 w-full" />
		</div>
	);
}

export {
	Skeleton,
	SkeletonCard,
	SkeletonProjectCard,
	SkeletonStat,
	SkeletonTable,
};
