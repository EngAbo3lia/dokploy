import {
	Activity,
	ArrowUpRight,
	Box,
	CheckCircle2,
	Clock,
	ExternalLink,
	GitBranch,
	Globe,
	Layers,
	Play,
	Rocket,
	Server,
	Terminal,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, StatusDot } from "@/components/shared/status-indicator";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { api } from "@/utils/api";
import { ShowDockerLogs } from "./logs/show";
import { ShowDeployments } from "./deployments/show-deployments";

interface Props {
	applicationId: string;
	onTabChange: (tab: string) => void;
}

export const ApplicationCommandCenter = ({ applicationId, onTabChange }: Props) => {
	const { data: app } = api.application.one.useQuery({ applicationId });
	const { data: domains } = api.domain.byApplicationId.useQuery({ applicationId });
	const { data: deployments } = api.deployment.allByType.useQuery({
		id: applicationId,
		type: "application",
	});

	if (!app) return null;

	const primaryDomain = domains && domains.length > 0 ? domains[0] : null;
	const domainUrl = primaryDomain
		? `${primaryDomain.https ? "https" : "http"}://${primaryDomain.host}${primaryDomain.path || ""}`
		: null;

	const lastDeployment = deployments && deployments.length > 0 ? deployments[0] : null;

	const getSourceLabel = () => {
		if (app.sourceType === "github" || app.sourceType === "gitlab" || app.sourceType === "bitbucket" || app.sourceType === "gitea" || app.sourceType === "git") {
			return `${app.owner ? `${app.owner}/` : ""}${app.repository || "Repository"}:${app.branch || "main"}`;
		}
		if (app.sourceType === "docker") {
			return app.dockerImage || "Docker Image";
		}
		return app.sourceType || "Custom Source";
	};

	return (
		<div className="flex flex-col gap-6">
			{/* Top Summary Bar */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{/* Status Tile */}
				<Card className="bg-card shadow-xs ring-1 ring-border transition-all hover:shadow-sm">
					<CardContent className="p-5 flex flex-col gap-1">
						<span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
							<Activity className="size-4" />
							Service Status
						</span>
						<div className="flex items-center gap-2.5 mt-1">
							<StatusDot status={app.applicationStatus === "running" ? "running" : app.applicationStatus === "error" ? "error" : "stopped"} />
							<span className="text-lg font-semibold capitalize">
								{app.applicationStatus || "Idle"}
							</span>
						</div>
					</CardContent>
				</Card>

				{/* Source Tile */}
				<Card className="bg-card shadow-xs ring-1 ring-border transition-all hover:shadow-sm">
					<CardContent className="p-5 flex flex-col gap-1">
						<span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
							<GitBranch className="size-4" />
							Source Code
						</span>
						<span className="truncate text-base font-semibold mt-1" title={getSourceLabel()}>
							{getSourceLabel()}
						</span>
					</CardContent>
				</Card>

				{/* Primary Domain Tile */}
				<Card className="bg-card shadow-xs ring-1 ring-border transition-all hover:shadow-sm">
					<CardContent className="p-5 flex flex-col gap-1">
						<span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
							<Globe className="size-4" />
							Primary URL
						</span>
						{domainUrl ? (
							<Link
								href={domainUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1.5 text-base font-semibold text-primary hover:underline truncate mt-1"
							>
								<span className="truncate">{primaryDomain?.host}</span>
								<ExternalLink className="size-3.5 shrink-0" />
							</Link>
						) : (
							<button
								type="button"
								onClick={() => onTabChange("domains")}
								className="text-sm text-muted-foreground hover:text-foreground text-left mt-1"
							>
								+ Add Domain
							</button>
						)}
					</CardContent>
				</Card>

				{/* Last Deployment Tile */}
				<Card className="bg-card shadow-xs ring-1 ring-border transition-all hover:shadow-sm">
					<CardContent className="p-5 flex flex-col gap-1">
						<span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
							<Clock className="size-4" />
							Last Deployment
						</span>
						<div className="flex items-center gap-2 mt-1">
							{lastDeployment ? (
								<>
									<StatusDot status={lastDeployment.status === "done" ? "running" : lastDeployment.status === "error" ? "error" : "deploying"} />
									<DateTooltip date={lastDeployment.createdAt}>
										<span className="text-sm font-medium">Deployed</span>
									</DateTooltip>
								</>
							) : (
								<span className="text-sm text-muted-foreground">No deployments yet</span>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Main Command Center Split View */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Section: Live Container Logs & Build Pipeline (2 cols) */}
				<div className="lg:col-span-2 flex flex-col gap-4">
					<Card className="bg-card shadow-xs ring-1 ring-border">
						<CardHeader className="flex flex-row items-center justify-between pb-3">
							<CardTitle className="text-base font-semibold flex items-center gap-2">
								<Terminal className="size-4 text-primary" />
								Live Runtime & Container Logs
							</CardTitle>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onTabChange("logs")}
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								Full Log View <ArrowUpRight className="size-3 ml-1" />
							</Button>
						</CardHeader>
						<CardContent className="p-0 border-t">
							<div className="max-h-[500px] overflow-hidden">
								<ShowDockerLogs
									appName={app.appName || ""}
									serverId={app.serverId || ""}
									serviceId={app.applicationId}
								/>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar Section: Quick Details & Linked Navigation (1 col) */}
				<div className="flex flex-col gap-6">
					<Card className="bg-card shadow-xs ring-1 ring-border">
						<CardHeader className="pb-3">
							<CardTitle className="text-base font-semibold flex items-center gap-2">
								<Layers className="size-4 text-primary" />
								Quick Configuration
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4 text-sm">
							<div className="flex items-center justify-between border-b pb-2">
								<span className="text-muted-foreground">App Name</span>
								<span className="font-mono text-xs font-semibold">{app.appName}</span>
							</div>

							<div className="flex items-center justify-between border-b pb-2">
								<span className="text-muted-foreground">Build Type</span>
								<Badge variant="secondary" className="uppercase text-[10px]">
									{app.buildType || "Nixpacks"}
								</Badge>
							</div>

							<div className="flex items-center justify-between border-b pb-2">
								<span className="text-muted-foreground">Server</span>
								<span className="font-medium text-xs">
									{app.server?.name || "Dokploy Server"}
								</span>
							</div>

							<div className="flex flex-col gap-2 pt-2">
								<Button
									variant="outline"
									size="sm"
									className="w-full justify-start gap-2"
									onClick={() => onTabChange("environment")}
								>
									<Badge variant="outline" className="size-5 rounded-full p-0 flex items-center justify-center text-[10px]">
										ENV
									</Badge>
									Manage Environment Variables
								</Button>

								<Button
									variant="outline"
									size="sm"
									className="w-full justify-start gap-2"
									onClick={() => onTabChange("domains")}
								>
									<Globe className="size-3.5" />
									Configure Domains ({domains?.length || 0})
								</Button>

								<Button
									variant="outline"
									size="sm"
									className="w-full justify-start gap-2"
									onClick={() => onTabChange("deployments")}
								>
									<Rocket className="size-3.5" />
									View Deployment History ({deployments?.length || 0})
								</Button>

								<Button
									variant="outline"
									size="sm"
									className="w-full justify-start gap-2"
									onClick={() => onTabChange("advanced")}
								>
									<Server className="size-3.5" />
									Advanced Settings & Ports
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
};
