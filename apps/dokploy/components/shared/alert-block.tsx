import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends React.ComponentPropsWithoutRef<"div"> {
	icon?: React.ReactNode;
	type?: "info" | "success" | "warning" | "error";
}

const iconMap = {
	info: {
		className: "bg-info/10 text-info",
		icon: Info,
	},
	success: {
		className: "bg-success/10 text-success",
		icon: CheckCircle2,
	},
	warning: {
		className: "bg-warning/10 text-warning",
		icon: AlertCircle,
	},
	error: {
		className: "bg-destructive/10 text-destructive",
		icon: AlertTriangle,
	},
};

export function AlertBlock({
	type = "info",
	icon,
	children,
	className,
	...props
}: Props) {
	const { className: iconClassName, icon: Icon } = iconMap[type];
	return (
		<div
			{...props}
			className={cn(
				"flex items-start flex-row gap-4 rounded-lg p-2",
				iconClassName,
				className,
			)}
		>
			<div className="shrink-0 mt-0.5">
				{icon || <Icon className="text-current" />}
			</div>
			<div className="flex-1 min-w-0">
				<span className="text-sm text-current wrap-break-word overflow-wrap-anywhere whitespace-pre-wrap">
					{children}
				</span>
			</div>
		</div>
	);
}
