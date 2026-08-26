import type { HealthServiceRow } from "@dokploy/server";
import { CheckCircle2, History, Loader2, Search, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";

type DeployItem = {
	deploymentId: string;
	serviceId: string;
	serviceName: string;
	serviceType: string;
	title: string;
	status: string;
	createdAt: string;
	startedAt: string | null;
	finishedAt: string | null;
};

const deployDate = (item: DeployItem) =>
	item.finishedAt || item.startedAt || item.createdAt || "";

const STATUS_ICON = {
	done: {
		icon: CheckCircle2,
		className: "text-emerald-600 dark:text-emerald-400",
	},
	error: {
		icon: XCircle,
		className: "text-red-600 dark:text-red-400",
	},
	running: {
		icon: Loader2,
		className: "text-blue-600 dark:text-blue-400 animate-spin",
	},
	cancelled: {
		icon: XCircle,
		className: "text-muted-foreground",
	},
} as const;

type Props = {
	projectId: string;
	environmentId: string;
	healthServices: HealthServiceRow[];
};

export const ProjectDeployments = ({
	projectId,
	environmentId,
	healthServices,
}: Props) => {
	const [filter, setFilter] = useState<"all" | "error">("all");
	const [items, setItems] = useState<DeployItem[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const utils = api.useUtils();
	const fetchers = useMemo(() => {
		const hooks: {
			type: "compose" | "application";
			serviceId: string;
		}[] = [];
		for (const service of healthServices) {
			if (service.type === "compose") {
				hooks.push({ type: "compose", serviceId: service.serviceId });
			} else if (service.type === "application") {
				hooks.push({ type: "application", serviceId: service.serviceId });
			}
		}
		return hooks;
	}, [healthServices]);

	const load = () => {
		setError(null);
		setItems(null);
		Promise.allSettled(
			fetchers.map((f) =>
				f.type === "compose"
					? utils.deployment.allByCompose.fetch({ composeId: f.serviceId })
					: utils.deployment.all.fetch({ applicationId: f.serviceId }),
			),
		)
			.then((results) => {
				let merged: DeployItem[] = [];
				results.forEach((result, index) => {
					const f = fetchers[index];
					if (!f || result.status !== "fulfilled") return;
					const service = healthServices.find(
						(s) => s.serviceId === f.serviceId,
					);
					const rows = (result.value || []) as unknown as Array<{
						deploymentId: string;
						title: string;
						status: string;
						createdAt: string;
						startedAt: string | null;
						finishedAt: string | null;
					}>;
					merged = merged.concat(
						rows.map((row) => ({
							deploymentId: row.deploymentId,
							serviceId: f.serviceId,
							serviceName: service?.name || "",
							serviceType: service?.type || f.type,
							title: row.title,
							status: row.status,
							createdAt: row.createdAt,
							startedAt: row.startedAt,
							finishedAt: row.finishedAt,
						})),
					);
				});
				merged.sort((a, b) => deployDate(b).localeCompare(deployDate(a)));
				setItems(merged);
			})
			.catch((err) => {
				setError(
					err instanceof Error ? err.message : "Failed to load deployments",
				);
			});
	};

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetchers]);

	if (error) {
		return (
			<Card>
				<CardContent className="flex h-40 flex-col items-center justify-center gap-3">
					<span className="text-sm text-muted-foreground">
						Unable to load deployments
					</span>
					<Button variant="outline" size="sm" onClick={load}>
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (!items) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 5 }).map((_, index) => (
					<div
						key={index}
						className="h-14 w-full animate-pulse rounded-lg border bg-muted/40"
					/>
				))}
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<Card>
				<EmptyState
					icon={<History className="size-8 text-muted-foreground/60" />}
					title="No deployments yet"
					description="Deployments will appear here after your first deploy."
				/>
			</Card>
		);
	}

	const filtered =
		filter === "all" ? items : items.filter((item) => item.status === "error");

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex flex-row items-center justify-between gap-2">
					<span className="flex items-center gap-2 text-base">
						<History className="size-4 text-muted-foreground" />
						Deployments
					</span>
					<div className="flex flex-row gap-1">
						<Button
							variant={filter === "all" ? "default" : "ghost"}
							size="sm"
							onClick={() => setFilter("all")}
						>
							All
						</Button>
						<Button
							variant={filter === "error" ? "default" : "ghost"}
							size="sm"
							onClick={() => setFilter("error")}
						>
							Errors
						</Button>
					</div>
				</CardTitle>
				<CardDescription>
					Deployment history across every service in this environment
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				{filtered.map((item) => {
					const status = STATUS_ICON[
						item.status as keyof typeof STATUS_ICON
					] || { icon: CheckCircle2, className: "text-muted-foreground" };
					const Icon = status.icon;
					return (
						<div
							key={item.deploymentId}
							className="flex flex-row items-center justify-between gap-3 rounded-lg border px-3 py-2"
						>
							<div className="flex min-w-0 flex-row items-center gap-3">
								<Icon className={`size-4 shrink-0 ${status.className}`} />
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">{item.title}</p>
									<p className="truncate text-xs text-muted-foreground">
										<span className="font-medium text-foreground">
											{item.serviceName}
										</span>
										{" · "}
										{item.status === "error"
											? "Failed"
											: item.status === "done"
												? "Successful"
												: item.status}
									</p>
								</div>
							</div>
							<div className="flex shrink-0 flex-col items-end gap-1">
								<DateTooltip date={deployDate(item)}>
									<span className="text-xs text-muted-foreground">
										Deployed
									</span>
								</DateTooltip>
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-xs"
									asChild
								>
									<Link
										href={`/dashboard/project/${projectId}/environment/${environmentId}/services/${item.serviceType}/${item.serviceId}`}
									>
										View service
									</Link>
								</Button>
							</div>
						</div>
					);
				})}
				{filtered.length === 0 && (
					<EmptyState
						icon={<Search />}
						title="No deployments match your filters"
						description="Try adjusting your filter criteria."
						className="py-6"
					/>
				)}
			</CardContent>
		</Card>
	);
};
