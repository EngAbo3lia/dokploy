import {
	Boxes,
	CheckCircle2,
	Cpu,
	GitBranch,
	Globe2,
	Loader2,
	MemoryStick,
	Play,
	RefreshCw,
	Server,
	TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";

type ContainerMetricSample = {
	timestamp: string;
	CPU: number;
	Memory: {
		used: number;
		usedUnit: string;
	};
	ID: string;
};

type ContainerItem = {
	containerId: string;
	name: string;
	state: string;
	status: string;
};

type Props = {
	composeId: string;
	name: string;
	description: string | null;
	composeStatus: string | null;
	composeType: string;
	sourceType: string;
	serverId: string;
	serverName: string | null;
	appName: string;
	canDeploy: boolean;
	canReadDomains: boolean;
	canReadDeployments: boolean;
};

const latestPerContainer = (samples: ContainerMetricSample[]) => {
	const byId = new Map<string, ContainerMetricSample>();
	for (const sample of samples) {
		const existing = byId.get(sample.ID);
		if (!existing || (sample.timestamp || "").localeCompare(existing.timestamp) >= 0) {
			byId.set(sample.ID, sample);
		}
	}
	return [...byId.values()];
};

export const ComposeOverview = ({
	composeId,
	name,
	description,
	composeType,
	sourceType,
	serverId,
	serverName,
	appName,
	canDeploy,
	canReadDomains,
	canReadDeployments,
}: Props) => {
	const { data: composeData } = api.compose.one.useQuery({ composeId });
	const { data: deployments } = api.deployment.allByCompose.useQuery(
		{ composeId },
		{ enabled: canReadDeployments },
	);
	const { data: metricsToken } = api.user.getMetricsToken.useQuery(undefined, {
		enabled: !!appName,
	});
	const utils = api.useUtils();

	const { mutateAsync: deployCompose, isPending: isDeploying } =
		api.compose.deploy.useMutation();
	const { mutateAsync: redeployCompose, isPending: isRedeploying } =
		api.compose.redeploy.useMutation();

	const [containers, setContainers] = useState<ContainerItem[]>([]);
	const [metrics, setMetrics] = useState<{
		cpu: number | null;
		memory: number | null;
		memoryUnit: string | null;
	} | null>(null);

	const loadContainers = useCallback(async () => {
		try {
			const all = (await utils.docker.getContainers.fetch({})) as unknown as
				ContainerItem[];
			const prefix = appName.toLowerCase();
			setContainers(
				(all || []).filter((c) => c.name.toLowerCase().startsWith(prefix)),
			);
		} catch {
			setContainers([]);
		}
	}, [appName, utils]);

	useEffect(() => {
		loadContainers();
	}, [loadContainers]);

	useEffect(() => {
		if (!appName) return;
		const token = metricsToken?.metricsConfig?.server?.token || "";
		const port = metricsToken?.metricsConfig?.server?.port;
		const url =
			metricsToken?.serverIp && port
				? `http://${metricsToken.serverIp}:${port}`
				: "http://localhost:4500";
		utils.user
			.getContainerMetrics.fetch({
				url,
				token,
				appName,
				dataPoints: "50",
			})
			.then((data) => {
				const samples = data as unknown as ContainerMetricSample[];
				const latest = latestPerContainer(samples || []);
				const memoryUnit = latest[0]?.Memory?.usedUnit || null;
				const cpu = latest.reduce((acc, sample) => acc + (sample.CPU || 0), 0);
				const memory = latest.reduce(
					(acc, sample) => acc + (sample.Memory?.used || 0),
					0,
				);
				setMetrics({
					cpu: latest.length > 0 ? cpu : null,
					memory: latest.length > 0 ? memory : null,
					memoryUnit,
				});
			})
			.catch(() => setMetrics({ cpu: null, memory: null, memoryUnit: null }));
	}, [appName, metricsToken, utils]);

	const lastDeployment = [...(deployments || [])]
		.sort((a, b) =>
			((b.finishedAt || b.createdAt) || "").localeCompare(
				(a.finishedAt || a.createdAt) || "",
			),
		)
		.at(0);

	const running = containers.filter((c) => c.state === "running").length;
	const healthy = containers.filter((c) => c.status.includes("(healthy)")).length;
	const degraded = containers.some(
		(c) => c.status.includes("(unhealthy)") || c.state === "restarting",
	);

	const runtimeBadge =
		containers.length === 0
			? { label: "Unknown", className: "border-border bg-muted/40 text-muted-foreground", dot: "bg-muted-foreground/40" }
			: degraded
				? { label: "Degraded", className: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" }
				: running > 0
					? { label: "Running", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" }
					: { label: "Stopped", className: "border-border bg-muted/40 text-muted-foreground", dot: "bg-muted-foreground/50" };

	const domains = composeData?.domains || [];

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardContent className="flex flex-row flex-wrap items-center justify-between gap-4 p-6">
					<div className="flex flex-row items-center gap-3">
						<span
							className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${runtimeBadge.className}`}
						>
							<span className={`size-2 rounded-full ${runtimeBadge.dot}`} />
							{runtimeBadge.label}
						</span>
						<span className="text-sm text-muted-foreground">
							{containers.length} containers · {running} running ·{" "}
							{healthy} healthy
							{degraded && (
								<span className="ml-2 text-amber-600 dark:text-amber-400">
									⚠ some containers restarting/unhealthy
								</span>
							)}
						</span>
					</div>
					{canDeploy && (
						<div className="flex flex-row gap-2">
							<Button
								size="sm"
								disabled={isDeploying || isRedeploying}
								onClick={() =>
									deployCompose({ composeId, title: "Deploy" })
										.then(() => toast.success("Deployment queued"))
										.catch((error) =>
											toast.error(
												error instanceof Error
													? error.message
													: "Deploy failed",
											),
										)
								}
							>
								<Play className="size-4" />
								Deploy
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={isDeploying || isRedeploying}
								onClick={() =>
									redeployCompose({ composeId })
										.then(() => toast.success("Redeploy queued"))
										.catch((error) =>
											toast.error(
												error instanceof Error
													? error.message
													: "Redeploy failed",
											),
										)
								}
							>
								{isRedeploying ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<RefreshCw className="size-4" />
								)}
								Restart
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Information</CardTitle>
						<CardDescription>Infrastructure facts about this service</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex items-center gap-2 text-sm">
							<Server className="size-4 text-muted-foreground" />
							<span className="text-muted-foreground">Server</span>
							<span className="font-medium">
								{serverName || "Dokploy Server (local)"}
							</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<Boxes className="size-4 text-muted-foreground" />
							<span className="text-muted-foreground">Type</span>
							<span className="font-medium capitalize">
								{composeType || "docker-compose"} · {sourceType}
							</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<Boxes className="size-4 text-muted-foreground" />
							<span className="text-muted-foreground">Containers</span>
							<span className="font-medium">
								{containers.length} ({running} running · {healthy} healthy)
							</span>
						</div>
						{canReadDeployments && lastDeployment && (
							<div className="flex items-center gap-2 text-sm">
								<RefreshCw className="size-4 text-muted-foreground" />
								<span className="text-muted-foreground">
									Last deployment
								</span>
								<DateTooltip
									date={lastDeployment.finishedAt || lastDeployment.createdAt}
								>
									<span className="font-medium">—</span>
								</DateTooltip>
							</div>
						)}
						{composeData && (composeData.repository || composeData.branch) && (
							<div className="flex items-center gap-2 text-sm">
								<GitBranch className="size-4 text-muted-foreground" />
								<span className="text-muted-foreground">Git</span>
								<span className="truncate font-medium">
									{composeData.repository}
									{composeData.branch ? ` · ${composeData.branch}` : ""}
								</span>
							</div>
						)}
						{canReadDomains && domains.length > 0 && (
							<div className="flex flex-wrap gap-1.5 pt-1">
								<Globe2 className="size-4 text-muted-foreground" />
								{domains.map((domain) => (
									<a
										key={domain.domainId}
										href={`http${domain.https ? "s" : ""}://${domain.host}`}
										target="_blank"
										rel="noreferrer"
										className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
											domain.enabled
												? "border-border bg-accent hover:bg-primary/10"
												: "border-border bg-muted/40 text-muted-foreground line-through"
										}`}
									>
										{domain.host}
									</a>
								))}
							</div>
						)}
						{description && (
							<p className="pt-1 text-sm text-muted-foreground">
								{description}
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Resources</CardTitle>
						<CardDescription>
							Live container metrics (real telemetry only)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-1 rounded-xl border p-4">
								<span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
									<Cpu className="size-4" />
									CPU %
								</span>
								<span className="text-lg font-semibold">
									{metrics?.cpu !== null && metrics?.cpu !== undefined
										? metrics.cpu.toFixed(1)
										: "—"}
								</span>
							</div>
							<div className="flex flex-col gap-1 rounded-xl border p-4">
								<span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
									<MemoryStick className="size-4" />
									Memory
								</span>
								<span className="text-lg font-semibold">
									{metrics?.memory !== null && metrics?.memory !== undefined
										? `${metrics.memory.toFixed(1)} ${metrics.memoryUnit || ""}`
										: "—"}
								</span>
							</div>
						</div>
						{metrics?.cpu === null && (
							<p className="mt-4 text-xs text-muted-foreground">
								Monitoring service unreachable or not configured — no
								metrics available.
							</p>
						)}
						<div className="mt-4 flex flex-wrap gap-2">
							{containers.slice(0, 6).map((container) => (
								<span
									key={container.containerId}
									className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium ${
										container.state === "running"
											? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
											: "border-border bg-muted/40 text-muted-foreground"
									}`}
								>
									{container.state === "running" ? (
										<CheckCircle2 className="size-3" />
									) : (
										<TriangleAlert className="size-3" />
									)}
									{container.name}
								</span>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};
