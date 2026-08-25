import type { HealthServiceRow } from "@dokploy/server";
import {
	Activity,
	CheckCircle2,
	Container,
	Cpu,
	MemoryStick,
	RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
		percentage: number;
		used: number;
		total: number;
		unit: string;
		usedUnit: string;
		totalUnit: string;
	};
	Container: string;
	ID: string;
	Name: string;
};

type ServiceMetric = {
	serviceId: string;
	serviceName: string;
	appName: string;
	containers: number;
	cpu: number | null;
	memory: number | null;
	memoryUnit: string | null;
	error: string | null;
};

const formatMem = (value: number | null, unit: string | null) => {
	if (value === null) return "—";
	if (!unit) return `${value}`;
	return `${value.toFixed(1)} ${unit}`;
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

type Props = {
	services: HealthServiceRow[];
};

export const ProjectMonitoring = ({ services }: Props) => {
	const { data: metricsToken } = api.user.getMetricsToken.useQuery(undefined, {
		enabled: services.length > 0,
	});
	const utils = api.useUtils();
	const [rows, setRows] = useState<ServiceMetric[] | null>(null);
	const [overallError, setOverallError] = useState<string | null>(null);

	const baseUrl = useMemo(() => {
		const port = metricsToken?.metricsConfig?.server?.port;
		const ip = metricsToken?.serverIp;
		if (ip && port) {
			return `http://${ip}:${port}`;
		}
		return "http://localhost:4500";
	}, [metricsToken]);

	const token = metricsToken?.metricsConfig?.server?.token || "";

	const load = useCallback(async () => {
		setRows(null);
		setOverallError(null);

		const results = await Promise.allSettled(
			services.map(async (service) => {
				if (!service.appName) {
					throw new Error("No app name");
				}
				const data = (await utils.user.getContainerMetrics.fetch({
					url: baseUrl,
					token,
					appName: service.appName,
					dataPoints: "50",
				})) as unknown as ContainerMetricSample[];
				const latest = latestPerContainer(data || []);
				return {
					serviceId: service.serviceId,
					serviceName: service.name,
					appName: service.appName,
					containers: latest.length,
					cpu:
						latest.length > 0
							? latest.reduce((acc, sample) => acc + (sample.CPU || 0), 0)
							: null,
					memory:
						latest.length > 0
							? latest.reduce((acc, sample) => acc + (sample.Memory?.used || 0), 0)
							: null,
					memoryUnit: latest[0]?.Memory?.usedUnit || null,
					error: null,
				};
			}),
		);

		let hasAny = false;
		let allFailed = true;
		const mapped = results.map((result, index) => {
			const service = services[index];
			if (result.status === "fulfilled" && service) {
				hasAny = true;
				allFailed = false;
				return result.value;
			}
			return {
				serviceId: service?.serviceId || `unknown-${index}`,
				serviceName: service?.name || "Unknown",
				appName: service?.appName || "",
				containers: 0,
				cpu: null,
				memory: null,
				memoryUnit: null,
				error:
					result.status === "rejected" && result.reason instanceof Error
						? result.reason.message.slice(0, 120)
						: "Failed to load metrics",
			};
		});
		if (!hasAny) {
			setOverallError(
				"Monitoring data unavailable — verify the monitoring service (web server section) and that services are included in the monitoring configuration.",
			);
		} else if (allFailed) {
			setOverallError(
				"Monitoring data unavailable — no service returned metrics.",
			);
		}
		setRows(mapped);
	}, [baseUrl, token, services]);

	useEffect(() => {
		load();
		const interval = setInterval(() => {
			load();
		}, 15000);
		return () => clearInterval(interval);
	}, [load]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex flex-row items-center justify-between gap-2">
					<span className="flex items-center gap-2 text-base">
						<Activity className="size-4 text-muted-foreground" />
						Monitoring
					</span>
					<Button variant="ghost" size="icon" onClick={load}>
						<RefreshCw className="size-4" />
					</Button>
				</CardTitle>
				<CardDescription>
					Latest container metrics per service (auto-refresh 15s)
				</CardDescription>
			</CardHeader>
			<CardContent>
				{overallError && (
					<div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
						<Activity className="mt-0.5 size-4 shrink-0" />
						<span>{overallError}</span>
					</div>
				)}
				{!rows ? (
					<div className="space-y-2">
						{Array.from({ length: 4 }).map((_, index) => (
							<div
								key={index}
								className="h-10 w-full animate-pulse rounded-lg border bg-muted/40"
							/>
						))}
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
									<th className="py-2 pr-4 font-medium">Service</th>
									<th className="py-2 pr-4 font-medium">
										<span className="flex items-center gap-1">
											<Container className="size-3.5" />
											Containers
										</span>
									</th>
									<th className="py-2 pr-4 font-medium">
										<span className="flex items-center gap-1">
											<Cpu className="size-3.5" />
											CPU %
										</span>
									</th>
									<th className="py-2 pr-4 font-medium">
										<span className="flex items-center gap-1">
											<MemoryStick className="size-3.5" />
											Memory
										</span>
									</th>
									<th className="py-2 font-medium">Status</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row) => (
									<tr key={row.serviceId} className="border-b">
										<td className="py-2.5 pr-4">
											<p className="font-medium">{row.serviceName}</p>
											<p className="truncate font-mono text-xs text-muted-foreground">
												{row.appName}
											</p>
										</td>
										<td className="py-2.5 pr-4">{row.containers}</td>
										<td className="py-2.5 pr-4">
											{row.cpu !== null ? row.cpu.toFixed(1) : "—"}
										</td>
										<td className="py-2.5 pr-4">
											{formatMem(row.memory, row.memoryUnit)}
										</td>
										<td className="py-2.5">
											{row.error ? (
												<span className="text-xs text-amber-600 dark:text-amber-400">
													Unavailable
												</span>
											) : (
												<span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
													<CheckCircle2 className="size-3.5" />
													Collected
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>
		</Card>
	);
};
