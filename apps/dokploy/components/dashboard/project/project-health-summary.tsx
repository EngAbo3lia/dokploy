import type { HealthEnvironmentRow } from "@dokploy/server";
import {
	Boxes,
	Clock3,
	Globe2,
	Loader2,
	Play,
	Server,
	TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { DialogAction } from "@/components/shared/dialog-action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/utils/api";
import { STATUS_META } from "./health-status";

type Props = {
	health: HealthEnvironmentRow | undefined;
	isLoading: boolean;
	onRetry: () => void;
};

export const ProjectHealthSummary = ({
	health,
	isLoading,
	onRetry,
}: Props) => {
	const [isDeployingAll, setIsDeployingAll] = useState(false);
	const { mutateAsync: deployCompose } = api.compose.deploy.useMutation();

	if (isLoading) {
		return (
			<div className="h-20 w-full animate-pulse rounded-xl border bg-muted/40" />
		);
	}

	const services = health?.services || [];
	const composeServices = services.filter((s) => s.type === "compose");
	const meta = STATUS_META[health?.status || "unknown"];

	const serverNames = [
		...new Set(
			services
				.map((s) => s.serverName)
				.filter((name): name is string => Boolean(name)),
		),
	];
	const serverLabel =
		serverNames.length > 0
			? serverNames.join(" + ")
			: "Dokploy Server (local)";

	const domains = services.flatMap((s) => s.domains);
	const lastDeployAt = services
		.map((s) =>
			s.lastDeployment
				? s.lastDeployment.finishedAt ||
					s.lastDeployment.startedAt ||
					s.lastDeployment.createdAt
				: null,
		)
		.filter((d): d is string => Boolean(d))
		.sort()
		.at(-1) || null;

	const deployAll = () => {
		setIsDeployingAll(true);
		Promise.all(
			composeServices.map((service) =>
				deployCompose({
					composeId: service.serviceId,
					title: "Project deploy",
				}),
			),
		)
			.then(() => {
				toast.success(
					`${composeServices.length} service${composeServices.length > 1 ? "s" : ""} queued for deployment`,
				);
			})
			.catch((error) => {
				toast.error(error instanceof Error ? error.message : "Deploy failed");
			})
			.finally(() => setIsDeployingAll(false));
	};

	if (!health) {
		return (
			<div className="flex h-20 w-full flex-row items-center justify-between rounded-xl border bg-accent/50 px-4">
				<span className="text-sm text-muted-foreground">
					Project health unavailable
				</span>
				<Button variant="outline" size="sm" onClick={onRetry}>
					Retry
				</Button>
			</div>
		);
	}

	return (
		<div className="rounded-xl border bg-accent/30">
			<div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-2">
				<div className="flex flex-wrap items-center gap-3">
					<Badge
						variant="secondary"
						className={`gap-1.5 border px-3 py-1 text-sm ${meta.badge}`}
					>
						<span className="relative flex size-2">
							{meta.pulse && (
								<span
									className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${meta.dot}`}
								/>
							)}
							<span
								className={`relative inline-flex size-2 rounded-full ${meta.dot}`}
							/>
						</span>
						{meta.label}
					</Badge>
					<span className="flex items-center gap-2 text-sm text-muted-foreground">
						<span>
							{services.length} service{services.length !== 1 ? "s" : ""}
						</span>
						<span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
							<span className="size-1.5 rounded-full bg-emerald-500" />
							{services.filter((s) => s.runtime === "healthy").length} running
						</span>
						<span className="flex items-center gap-1 text-red-600 dark:text-red-400">
							<span className="size-1.5 rounded-full bg-red-500" />
							{services.filter((s) => s.runtime === "failed").length} failed
						</span>
						{services.filter((s) => s.isDeploying).length > 0 && (
							<span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
								<span className="size-1.5 rounded-full bg-blue-500" />
								{services.filter((s) => s.isDeploying).length} deploying
							</span>
						)}
					</span>
				</div>
				{composeServices.length > 0 && (
					<DialogAction
						title={`Deploy all ${composeServices.length} service${composeServices.length !== 1 ? "s" : ""}?`}
						description={`This will trigger a deployment for all ${composeServices.length} compose service${composeServices.length !== 1 ? "s" : ""} in this environment. Make sure your latest changes are committed before proceeding.`}
						type="default"
						onClick={deployAll}
					>
						<Button
							variant="outline"
							size="sm"
							disabled={isDeployingAll}
						>
							{isDeployingAll ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Play className="size-4" />
							)}
							Deploy all{composeServices.length > 0 ? ` ${composeServices.length}` : ""}
						</Button>
					</DialogAction>
				)}
			</div>
			<div className="flex flex-wrap gap-x-8 gap-y-3 p-4 pt-2 text-sm text-muted-foreground">
				<span className="flex items-center gap-1.5">
					<Boxes className="size-4" />
					<strong className="font-medium text-foreground">
						{health.containers.total}
					</strong>
					container{health.containers.total !== 1 ? "s" : ""}
					<span className="text-emerald-600 dark:text-emerald-400">
						· {health.containers.healthy} healthy
					</span>
				</span>
				<span className="flex items-center gap-1.5">
					<Globe2 className="size-4" />
					<strong className="font-medium text-foreground">
						{domains.length}
					</strong>
					domain{domains.length !== 1 ? "s" : ""}
					<span>· {domains.filter((d) => d.enabled).length} active</span>
				</span>
				<span className="flex items-center gap-1.5">
					<Clock3 className="size-4" />
					{lastDeployAt ? (
						<DateTooltip date={lastDeployAt}>Last deploy</DateTooltip>
					) : (
						<span>Last deploy — never</span>
					)}
				</span>
				<span className="flex items-center gap-1.5">
					<Server className="size-4" />
					<span className="truncate">{serverLabel}</span>
				</span>
				{health.services.some((s) => s.runtime === "degraded") && (
					<span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
						<TriangleAlert className="size-4" />
						Some containers restarting/unhealthy
					</span>
				)}
			</div>
		</div>
	);
};
