import type { HealthEnvironmentRow } from "@dokploy/server";
import {
	Boxes,
	Circle,
	Globe2,
	History,
	LayoutGrid,
	Server,
	TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { STATUS_META } from "./health-status";

type StatTile = {
	label: string;
	value: string | number;
	icon: React.ReactNode;
};

type Props = {
	projectId: string;
	environmentId: string;
	health: HealthEnvironmentRow | undefined;
	isLoading: boolean;
	onRetry: () => void;
};

export const ProjectOverview = ({
	projectId,
	environmentId,
	health,
	isLoading,
	onRetry,
}: Props) => {
	if (isLoading) {
		return (
			<div className="grid gap-4 lg:grid-cols-3">
				<div className="h-28 animate-pulse rounded-xl border bg-muted/40" />
				<div className="h-28 animate-pulse rounded-xl border bg-muted/40" />
				<div className="h-28 animate-pulse rounded-xl border bg-muted/40" />
				<div className="h-64 animate-pulse rounded-xl border bg-muted/40 lg:col-span-3" />
			</div>
		);
	}

	if (!health) {
		return (
			<Card>
				<CardContent className="flex h-40 flex-col items-center justify-center gap-3">
					<span className="text-sm text-muted-foreground">
						Project health information unavailable
					</span>
					<Button variant="outline" size="sm" onClick={onRetry}>
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	const services = health.services;
	const meta = STATUS_META[health.status];
	const serverNames = [
		...new Set(
			services.map((s) => s.serverName).filter(Boolean),
		),
	];
	const serverLabel =
		serverNames.length > 0
			? serverNames.join(" + ")
			: "Dokploy Server (local)";
	const domains = services.flatMap((s) => s.domains);
	const deployDates = services
		.map((s) =>
			s.lastDeployment
				? s.lastDeployment.finishedAt ||
					s.lastDeployment.startedAt ||
					s.lastDeployment.createdAt
				: null,
		)
		.filter((d): d is string => Boolean(d))
		.sort();

	const stats: StatTile[] = [
		{
			label: "Services",
			value: services.length,
			icon: <LayoutGrid className="size-4" />,
		},
		{
			label: "Containers",
			value: health.containers.total,
			icon: <Boxes className="size-4" />,
		},
		{
			label: "Domains",
			value: domains.length,
			icon: <Globe2 className="size-4" />,
		},
		{
			label: "Server",
			value: serverLabel,
			icon: <Server className="size-4" />,
		},
	];

	const recent = services
		.filter((s) => s.lastDeployment)
		.sort((a, b) =>
			((b.lastDeployment?.finishedAt || b.lastDeployment?.createdAt) || "")
				.localeCompare(
					(a.lastDeployment?.finishedAt || a.lastDeployment?.createdAt) || "",
				),
		)
		.slice(0, 6);

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardContent className="flex flex-col gap-4 p-6">
					<div className="flex flex-row items-center gap-3">
						<span
							className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${meta.badge}`}
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
						</span>
						<span className="text-sm text-muted-foreground">
							{services.length} services ·{" "}
							{services.filter((s) => s.runtime === "healthy").length}{" "}
							running ·{" "}
							{services.filter((s) => s.runtime === "failed").length} failed
						</span>
					</div>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{stats.map((stat) => (
							<div
								key={stat.label}
								className="flex flex-col gap-1 rounded-xl border p-4"
							>
								<span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
									{stat.icon}
									{stat.label}
								</span>
								<span className="truncate text-lg font-semibold">
									{stat.value}
								</span>
							</div>
						))}
					</div>
					{deployDates.length > 0 && (
						<p className="text-sm text-muted-foreground">
							Last deployment{" "}
							<DateTooltip date={deployDates[deployDates.length - 1] || ""}>
								<span className="font-medium text-foreground">was</span>
							</DateTooltip>
						</p>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<LayoutGrid className="size-4 text-muted-foreground" />
							Services
						</CardTitle>
						<CardDescription>
							Live status of every service in this environment
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{services.map((service) => {
							const dot =
								service.runtime === "healthy"
									? "bg-emerald-500"
									: service.runtime === "degraded"
										? "bg-amber-500"
										: service.runtime === "failed"
											? "bg-red-500"
											: "bg-muted-foreground/40";
							return (
								<Link
									key={service.serviceId}
									href={`/dashboard/project/${projectId}/environment/${environmentId}/services/${service.type}/${service.serviceId}`}
									className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-accent"
								>
									<span className="flex min-w-0 items-center gap-2.5">
										<span className={`size-2 shrink-0 rounded-full ${dot}`} />
										<span className="truncate text-sm font-medium">
											{service.name}
										</span>
									</span>
									<span className="flex shrink-0 items-center gap-3">
										<span className="text-xs text-muted-foreground">
											{service.containers.total} containers
										</span>
										{service.lastDeployment &&
											service.lastDeployment.finishedAt && (
												<DateTooltip
													date={service.lastDeployment.finishedAt}
												>
													<span className="text-xs text-muted-foreground">
														Deployed
													</span>
												</DateTooltip>
											)}
									</span>
								</Link>
							);
						})}
						{services.length === 0 && (
							<p className="py-6 text-center text-sm text-muted-foreground">
								No services in this environment yet
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<History className="size-4 text-muted-foreground" />
							Recent deployments
						</CardTitle>
						<CardDescription>
							Latest successful or failed deployments per service
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{recent.map((service) => (
							<div
								key={service.serviceId}
								className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
							>
								<span className="flex min-w-0 items-center gap-2.5">
									{service.lastDeployment?.status === "error" ? (
										<TriangleAlert className="size-3.5 shrink-0 text-red-600" />
									) : (
										<Circle className="size-3.5 shrink-0 fill-emerald-500 text-emerald-500" />
									)}
									<span className="truncate text-sm font-medium">
										{service.name}
									</span>
								</span>
								<span className="flex shrink-0 flex-col items-end gap-0.5">
									<span
										className={`text-xs ${
											service.lastDeployment?.status === "error"
												? "text-red-600"
												: "text-emerald-600 dark:text-emerald-400"
										}`}
									>
										{service.lastDeployment?.status === "error"
											? "Failed"
											: "Successful"}
									</span>
									{service.lastDeployment?.finishedAt && (
										<DateTooltip
											date={service.lastDeployment.finishedAt}
										>
											<span className="text-xs text-muted-foreground">
												When
											</span>
										</DateTooltip>
									)}
								</span>
							</div>
						))}
						{recent.length === 0 && (
							<p className="py-6 text-center text-sm text-muted-foreground">
								No deployments yet in this environment
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
};
