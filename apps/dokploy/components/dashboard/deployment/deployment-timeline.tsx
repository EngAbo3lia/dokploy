import { Check, Circle, Loader2, X } from "lucide-react";

interface Deployment {
	status: string | null;
	startedAt: string | null;
	finishedAt: string | null;
	environment: string | null;
}

const STEPS = [
	{ key: "queued", label: "Queued" },
	{ key: "building", label: "Building" },
	{ key: "deploying", label: "Deploying" },
	{ key: "done", label: "Live" },
] as const;

function getStepIndex(status: string | null): number {
	if (!status || status === "running") return 0;
	if (status === "done") return 3;
	if (status === "error") return 1;
	if (status === "cancelled") return 0;
	return 0;
}

export const DeploymentTimeline = ({
	deployment,
}: {
	deployment: Deployment;
}) => {
	const activeIndex = getStepIndex(deployment.status);
	const isError = deployment.status === "error";

	return (
		<div className="flex flex-col gap-0">
			{STEPS.map((step, i) => {
				const isComplete =
					i < activeIndex ||
					(i === activeIndex && deployment.status === "done");
				const isActive = i === activeIndex && deployment.status === "running";
				const isCurrent = i === activeIndex;

				return (
					<div key={step.key} className="flex items-start gap-3">
						<div className="flex flex-col items-center">
							<div
								className={`flex items-center justify-center size-6 rounded-full border-2 transition-colors ${
									isError && isCurrent
										? "border-red-500 bg-red-500/10"
										: isComplete
											? "border-emerald-500 bg-emerald-500/10"
											: isActive
												? "border-blue-500 bg-blue-500/10"
												: "border-muted-foreground/30 bg-muted/40"
								}`}
							>
								{isError && isCurrent ? (
									<X className="size-3 text-red-500" />
								) : isComplete ? (
									<Check className="size-3 text-emerald-500" />
								) : isActive ? (
									<Loader2 className="size-3 text-blue-500 animate-spin" />
								) : (
									<Circle className="size-3 text-muted-foreground/40" />
								)}
							</div>
							{i < STEPS.length - 1 && (
								<div
									className={`w-px h-6 ${
										i < activeIndex
											? "bg-emerald-500/40"
											: "bg-muted-foreground/20"
									}`}
								/>
							)}
						</div>
						<div className="flex flex-col gap-0.5 pb-4">
							<span
								className={`text-sm font-medium ${
									isComplete || isActive
										? "text-foreground"
										: "text-muted-foreground/60"
								}`}
							>
								{step.label}
							</span>
							{isCurrent && deployment.status === "running" && (
								<span className="text-xs text-muted-foreground">
									In progress...
								</span>
							)}
							{isCurrent && deployment.status === "done" && (
								<span className="text-xs text-emerald-500">Completed</span>
							)}
							{isCurrent && isError && (
								<span className="text-xs text-red-500">Failed</span>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
};
