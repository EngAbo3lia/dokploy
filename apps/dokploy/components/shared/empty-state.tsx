import { cn } from "@/lib/utils";

interface EmptyStateProps {
	icon?: React.ReactNode;
	title: string;
	description?: string;
	action?: React.ReactNode;
	className?: string;
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
	return (
		<div
			data-slot="empty-state"
			className={cn(
				"flex flex-col items-center justify-center py-16 px-8 text-center",
				className,
			)}
		>
			{icon && (
				<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
					{icon}
				</div>
			)}
			<h3 className="text-base font-medium text-foreground">{title}</h3>
			{description && (
				<p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
					{description}
				</p>
			)}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

export { EmptyState, type EmptyStateProps };
