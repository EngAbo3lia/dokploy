import type { HealthEnvironmentRow } from "@dokploy/server";
import { Box, Boxes, Globe2, History, LayoutGrid, Server } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, StatusDot } from "@/components/shared/status-indicator";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
		...new Set(services.map((s) => s.serverName).filter(Boolean)),
	];
	const serverLabel =
		serverNames.length > 0 ? serverNames.join(" + ") : "Dokploy Server (local)";
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
			(
				b.lastDeployment?.finishedAt ||
				b.lastDeployment?.createdAt ||
				""
			).localeCompare(
				a.lastDeployment?.finishedAt || a.lastDeployment?.createdAt || "",
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
							{services.filter((s) => s.runtime === "healthy").length} running ·{" "}
							{services.filter((s) => s.runtime === "failed").length} failed ·{" "}
							{services.filter((s) => s.runtime === "stopped").length} stopped
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
							const dotStatus =
								service.runtime === "healthy"
									? "success"
									: service.runtime === "degraded"
										? "warning"
										: service.runtime === "failed"
											? "error"
											: "stopped";
							return (
								<Link
									key={service.serviceId}
									href={`/dashboard/project/${projectId}/environment/${environmentId}/services/${service.type}/${service.serviceId}`}
									className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-accent"
								>
									<span className="flex min-w-0 items-center gap-2.5">
										<StatusDot status={dotStatus} />
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
												<DateTooltip date={service.lastDeployment.finishedAt}>
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
							<EmptyState
								icon={<Box className="size-8 text-muted-foreground/60" />}
								title="No services yet"
								description="Services will appear here once you add them to this environment."
								className="py-6"
							/>
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
									<StatusDot
										status={
											service.lastDeployment?.status === "error"
												? "error"
												: "success"
										}
									/>
									<span className="truncate text-sm font-medium">
										{service.name}
									</span>
								</span>
								<span className="flex shrink-0 flex-col items-end gap-0.5">
									<StatusBadge
										status={
											service.lastDeployment?.status === "error"
												? "failed"
												: "success"
										}
									>
										{service.lastDeployment?.status === "error"
											? "Failed"
											: "Successful"}
									</StatusBadge>
									{service.lastDeployment?.finishedAt && (
										<DateTooltip date={service.lastDeployment.finishedAt}>
											<span className="text-xs text-muted-foreground">
												When
											</span>
										</DateTooltip>
									)}
								</span>
							</div>
						))}
						{recent.length === 0 && (
							<EmptyState
								icon={<History className="size-8 text-muted-foreground/60" />}
								title="No deployments yet"
								description="Recent deployments will appear here after your first deploy."
								className="py-6"
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
};
