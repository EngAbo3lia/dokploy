import type { HealthServiceRow } from "@dokploy/server";
import {
	ArrowUpRight,
	CalendarClock,
	Globe2,
	KeyRound,
	Settings2,
} from "lucide-react";
import Link from "next/link";
import { EnvironmentVariables } from "@/components/dashboard/project/environment-variables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type Props = {
	projectId: string;
	environmentId: string;
	services: HealthServiceRow[];
};

const ConfigCard = ({
	icon,
	title,
	description,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	children: React.ReactNode;
}) => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2 text-base">
				{icon}
				{title}
			</CardTitle>
			<CardDescription>{description}</CardDescription>
		</CardHeader>
		<CardContent>{children}</CardContent>
	</Card>
);

export const ProjectConfiguration = ({
	projectId,
	environmentId,
	services,
}: Props) => {
	const domains = services.flatMap((service) =>
		(service.domains || []).map((domain) => ({ service, ...domain })),
	);

	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<ConfigCard
				icon={<Globe2 className="size-4 text-muted-foreground" />}
				title="Domains"
				description="Routes, HTTPS and certificate status for this environment"
			>
				{domains.length === 0 ? (
					<p className="py-4 text-center text-sm text-muted-foreground">
						No domains configured — add one from any service page
					</p>
				) : (
					<div className="space-y-2">
						{domains.map((domain) => (
							<Link
								key={`${domain.service.serviceId}-${domain.host}`}
								href={`/dashboard/project/${projectId}/environment/${environmentId}/services/${domain.service.type}/${domain.service.serviceId}?tab=domains`}
								className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-accent"
							>
								<span className="flex min-w-0 items-center gap-2">
									<ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
									<span className="truncate text-sm font-medium">
										{domain.host}
									</span>
								</span>
								<span className="flex shrink-0 items-center gap-2">
									<span className="truncate text-xs text-muted-foreground">
										{domain.service.name}
									</span>
									{domain.enabled ? (
										<Badge
											variant="secondary"
											className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
										>
											Active
										</Badge>
									) : (
										<Badge
											variant="secondary"
											className="text-muted-foreground"
										>
											Disabled
										</Badge>
									)}
								</span>
							</Link>
						))}
					</div>
				)}
			</ConfigCard>

			<ConfigCard
				icon={<KeyRound className="size-4 text-muted-foreground" />}
				title="Environment Variables"
				description="Shared variables and secrets for this environment"
			>
				<EnvironmentVariables environmentId={environmentId}>
					<Button variant="outline" className="w-full justify-start">
						Manage environment variables
					</Button>
				</EnvironmentVariables>
				<p className="mt-3 text-xs text-muted-foreground">
					Variables apply to every service in this environment. Services can
					also override them from their own Environment tab.
				</p>
			</ConfigCard>

			<ConfigCard
				icon={<CalendarClock className="size-4 text-muted-foreground" />}
				title="Schedules"
				description="Automated deployment / stop / start tasks"
			>
				<Button asChild variant="outline" className="w-full justify-start">
					<Link href="/dashboard/schedules">Manage schedules</Link>
				</Button>
			</ConfigCard>

			<ConfigCard
				icon={<Settings2 className="size-4 text-muted-foreground" />}
				title="Service configuration"
				description="Compose files, git source, mounts and networking per service"
			>
				<div className="space-y-2">
					{services.slice(0, 6).map((service) => (
						<Link
							key={service.serviceId}
							href={`/dashboard/project/${projectId}/environment/${environmentId}/services/${service.type}/${service.serviceId}?tab=environment`}
							className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-accent"
						>
							<span className="truncate text-sm font-medium">
								{service.name}
							</span>
							<span className="shrink-0 text-xs text-muted-foreground">
								{service.type} · open configuration
							</span>
						</Link>
					))}
					{services.length === 0 && (
						<p className="py-4 text-center text-sm text-muted-foreground">
							No services to configure
						</p>
					)}
				</div>
			</ConfigCard>
		</div>
	);
};
