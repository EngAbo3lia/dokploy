import copy from "copy-to-clipboard";
import {
	ArrowLeft,
	ArrowRight,
	ChevronDown,
	ChevronUp,
	Clock,
	Copy,
	Filter,
	Loader2,
	RefreshCcw,
	RocketIcon,
	Search,
	Settings,
	Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DeploymentDetail } from "@/components/dashboard/deployment/deployment-detail";
import { AlertBlock } from "@/components/shared/alert-block";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { DialogAction } from "@/components/shared/dialog-action";
import { StatusTooltip } from "@/components/shared/status-tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api, type RouterOutputs } from "@/utils/api";
import { ShowRollbackSettings } from "../rollbacks/show-rollback-settings";
import { CancelQueues } from "./cancel-queues";
import { ClearDeployments } from "./clear-deployments";
import { KillBuild } from "./kill-build";
import { RefreshToken } from "./refresh-token";
import { ShowDeployment } from "./show-deployment";

interface Props {
	id: string;
	type:
		| "application"
		| "compose"
		| "schedule"
		| "server"
		| "backup"
		| "previewDeployment"
		| "volumeBackup";
	refreshToken?: string;
	serverId?: string;
}

export const formatDuration = (seconds: number) => {
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
};

const STATUS_BADGE: Record<string, string> = {
	running: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
	done: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	error: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
	cancelled: "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
};

export const ShowDeployments = ({
	id,
	type,
	refreshToken,
	serverId,
}: Props) => {
	const [activeLog, setActiveLog] = useState<
		RouterOutputs["deployment"]["all"][number] | null
	>(null);
	const [detailDeploymentId, setDetailDeploymentId] = useState<string | null>(
		null,
	);
	const [removingDeploymentIds, setRemovingDeploymentIds] = useState<
		Set<string>
	>(new Set());
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [environmentFilter, setEnvironmentFilter] = useState("all");
	const [page, setPage] = useState(1);
	const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
		new Set(),
	);

	const isFilterable = type === "application" || type === "compose";

	const { data: filteredData, isPending: isLoadingDeployments } =
		api.deployment.filteredList.useQuery(
			{
				id,
				type: type as "application" | "compose",
				status: statusFilter !== "all" ? statusFilter : undefined,
				environment:
					environmentFilter !== "all" ? environmentFilter : undefined,
				search: search || undefined,
				page,
				pageSize: 20,
			},
			{
				enabled: isFilterable && !!id,
				refetchInterval: 1000,
			},
		);

	const { data: legacyDeployments, isPending: isLoadingLegacy } =
		api.deployment.allByType.useQuery(
			{ id, type },
			{
				enabled: !isFilterable && !!id,
				refetchInterval: 1000,
			},
		);

	const deployments = isFilterable ? filteredData?.items : legacyDeployments;
	const isLoading = isFilterable ? isLoadingDeployments : isLoadingLegacy;
	const totalPages = filteredData?.totalPages ?? 1;
	const total = filteredData?.total ?? 0;

	const { data: isCloud } = api.settings.isCloud.useQuery();

	const { mutateAsync: rollback, isPending: isRollingBack } =
		api.rollback.rollback.useMutation();
	const { mutateAsync: killProcess, isPending: isKillingProcess } =
		api.deployment.killProcess.useMutation();
	const { mutateAsync: removeDeployment } =
		api.deployment.removeDeployment.useMutation();

	const {
		mutateAsync: cancelApplicationDeployment,
		isPending: isCancellingApp,
	} = api.application.cancelDeployment.useMutation();
	const {
		mutateAsync: cancelComposeDeployment,
		isPending: isCancellingCompose,
	} = api.compose.cancelDeployment.useMutation();

	const [url, setUrl] = React.useState("");

	const webhookUrl = useMemo(
		() =>
			`${url}/api/deploy${type === "compose" ? "/compose" : ""}/${refreshToken}`,
		[url, refreshToken, type],
	);

	const MAX_DESCRIPTION_LENGTH = 200;

	const truncateDescription = (description: string): string => {
		if (description.length <= MAX_DESCRIPTION_LENGTH) {
			return description;
		}
		const truncated = description.slice(0, MAX_DESCRIPTION_LENGTH);
		const lastSpace = truncated.lastIndexOf(" ");
		if (lastSpace > MAX_DESCRIPTION_LENGTH - 20 && lastSpace > 0) {
			return `${truncated.slice(0, lastSpace)}...`;
		}
		return `${truncated}...`;
	};

	const stuckDeployment = useMemo(() => {
		if (!isCloud || !deployments || deployments.length === 0) return null;

		const now = Date.now();
		const TEN_MINUTES = 10 * 60 * 1000;
		const mostRecentDeployment = deployments[0];

		if (
			!mostRecentDeployment ||
			mostRecentDeployment.status !== "running" ||
			!mostRecentDeployment.startedAt
		) {
			return null;
		}

		const startTime = new Date(mostRecentDeployment.startedAt).getTime();
		const elapsed = now - startTime;

		return elapsed > TEN_MINUTES ? mostRecentDeployment : null;
	}, [isCloud, deployments]);

	useEffect(() => {
		setUrl(document.location.origin);
	}, []);

	useEffect(() => {
		setPage(1);
	}, [search, statusFilter, environmentFilter]);

	if (detailDeploymentId) {
		return (
			<DeploymentDetail
				deploymentId={detailDeploymentId}
				onBack={() => setDetailDeploymentId(null)}
			/>
		);
	}

	return (
		<Card className="bg-background border-0">
			<CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
				<div className="flex flex-col gap-2">
					<CardTitle className="text-xl">Deployments</CardTitle>
					<CardDescription>
						{isFilterable
							? `${total} deployment${total !== 1 ? "s" : ""}`
							: "See the last 10 deployments"}
					</CardDescription>
				</div>
				<div className="flex flex-row items-center flex-wrap gap-2">
					{(type === "application" || type === "compose") && (
						<ClearDeployments id={id} type={type} />
					)}
					{(type === "application" || type === "compose") && (
						<KillBuild id={id} type={type} />
					)}
					{(type === "application" || type === "compose") && (
						<CancelQueues id={id} type={type} />
					)}
					{type === "application" && (
						<ShowRollbackSettings applicationId={id}>
							<Button variant="outline">
								Configure Rollbacks <Settings className="size-4" />
							</Button>
						</ShowRollbackSettings>
					)}
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{stuckDeployment && (type === "application" || type === "compose") && (
					<AlertBlock
						type="warning"
						className="flex-col items-start w-full p-4"
					>
						<div className="flex flex-col gap-3">
							<div>
								<div className="font-medium text-sm mb-1">
									Build appears to be stuck
								</div>
								<p className="text-sm">
									Hey! Looks like the build has been running for more than 10
									minutes. Would you like to cancel this deployment?
								</p>
							</div>
							<Button
								variant="destructive"
								size="sm"
								className="w-fit"
								isLoading={
									type === "application" ? isCancellingApp : isCancellingCompose
								}
								onClick={async () => {
									try {
										if (type === "application") {
											await cancelApplicationDeployment({
												applicationId: id,
											});
										} else if (type === "compose") {
											await cancelComposeDeployment({
												composeId: id,
											});
										}
										toast.success("Deployment cancellation requested");
									} catch (error) {
										toast.error(
											error instanceof Error
												? error.message
												: "Failed to cancel deployment",
										);
									}
								}}
							>
								Cancel Deployment
							</Button>
						</div>
					</AlertBlock>
				)}

				{refreshToken && (
					<div className="flex flex-col gap-2 text-sm">
						<span>
							If you want to re-deploy this application use this URL in the
							config of your git provider or docker
						</span>
						<div className="flex flex-row items-center gap-2 flex-wrap">
							<span>Webhook URL: </span>
							<div className="flex flex-row items-center gap-2">
								<Badge
									tabIndex={0}
									aria-label="Copy webhook URL to clipboard"
									className="p-2 rounded-md ml-1 mr-1 hover:border-primary hover:text-primary-foreground hover:bg-primary hover:cursor-pointer whitespace-normal break-all"
									variant="outline"
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											copy(webhookUrl);
											toast.success("Copied to clipboard.");
										}
									}}
									onClick={() => {
										copy(webhookUrl);
										toast.success("Copied to clipboard.");
									}}
								>
									{webhookUrl}
									<Copy className="h-4 w-4 ml-2" />
								</Badge>
								{(type === "application" || type === "compose") && (
									<RefreshToken id={id} type={type} />
								)}
							</div>
						</div>
					</div>
				)}

				{isFilterable && (
					<div className="flex flex-row items-center gap-3 flex-wrap">
						<div className="relative flex-1 min-w-[200px] max-w-sm">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								placeholder="Search deployments..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9"
							/>
						</div>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-[140px]">
								<Filter className="size-3.5 mr-2" />
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								<SelectItem value="running">Running</SelectItem>
								<SelectItem value="done">Done</SelectItem>
								<SelectItem value="error">Error</SelectItem>
								<SelectItem value="cancelled">Cancelled</SelectItem>
							</SelectContent>
						</Select>
						<Select
							value={environmentFilter}
							onValueChange={setEnvironmentFilter}
						>
							<SelectTrigger className="w-[140px]">
								<SelectValue placeholder="Environment" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All envs</SelectItem>
								<SelectItem value="production">Production</SelectItem>
								<SelectItem value="preview">Preview</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}

				{isLoading ? (
					<div className="flex w-full flex-row items-center justify-center gap-3 pt-10 min-h-[25vh]">
						<div className="flex flex-col items-center gap-3">
							<div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
							<span className="text-sm text-muted-foreground">
								Loading deployments...
							</span>
						</div>
					</div>
				) : !deployments || deployments.length === 0 ? (
					<div className="flex w-full flex-col items-center justify-center gap-3 pt-10 min-h-[25vh]">
						<RocketIcon className="size-8 text-muted-foreground" />
						<span className="text-sm text-muted-foreground">
							{search || statusFilter !== "all" || environmentFilter !== "all"
								? "No deployments match your filters"
								: "No deployments found"}
						</span>
					</div>
				) : (
					<div className="flex flex-col gap-0">
						<div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-2 text-xs text-muted-foreground border-b">
							<span className="w-8" />
							<span>Deployment</span>
							<span className="hidden sm:block w-24 text-right">Duration</span>
							<span className="w-20 text-right">Status</span>
							<span className="w-32 text-right">Date</span>
						</div>
						{deployments.map((deployment, index) => {
							const titleText = deployment?.title?.trim() || "";
							const needsTruncation = titleText.length > MAX_DESCRIPTION_LENGTH;
							const isExpanded = expandedDescriptions.has(
								deployment.deploymentId,
							);
							const canDelete =
								deployment.status === "done" || deployment.status === "error";

							const duration =
								deployment.startedAt && deployment.finishedAt
									? Math.floor(
											(new Date(deployment.finishedAt).getTime() -
												new Date(deployment.startedAt).getTime()) /
												1000,
										)
									: null;

							return (
								<div
									key={deployment.deploymentId}
									className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
								>
									<StatusTooltip
										status={deployment?.status}
										className="size-2.5"
									/>

									<div className="flex flex-col gap-0.5 min-w-0">
										<div className="flex items-center gap-2">
											<span className="font-medium text-sm truncate">
												{isExpanded || !needsTruncation
													? titleText
													: truncateDescription(titleText)}
											</span>
											<Badge
												variant="outline"
												className={`text-[10px] shrink-0 ${STATUS_BADGE[deployment.status || ""] || ""}`}
											>
												{deployment.status}
											</Badge>
											{deployment.environment && (
												<Badge
													variant="secondary"
													className="text-[10px] shrink-0"
												>
													{deployment.environment}
												</Badge>
											)}
										</div>
										{needsTruncation && (
											<button
												type="button"
												onClick={() => {
													const next = new Set(expandedDescriptions);
													if (next.has(deployment.deploymentId)) {
														next.delete(deployment.deploymentId);
													} else {
														next.add(deployment.deploymentId);
													}
													setExpandedDescriptions(next);
												}}
												className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit cursor-pointer"
											>
												{isExpanded ? (
													<>
														<ChevronUp className="size-3" />
														Show less
													</>
												) : (
													<>
														<ChevronDown className="size-3" />
														Show more
													</>
												)}
											</button>
										)}
										{deployment.description?.trim() && (
											<span className="text-xs text-muted-foreground font-mono">
												{deployment.description}
											</span>
										)}
										<div className="flex items-center gap-2 mt-0.5">
											{deployment.gitBranch && (
												<span className="text-[10px] text-muted-foreground font-mono">
													{deployment.gitBranch}
												</span>
											)}
											{deployment.gitCommitSha && (
												<span className="text-[10px] text-muted-foreground font-mono">
													{deployment.gitCommitSha.slice(0, 7)}
												</span>
											)}
										</div>
									</div>

									<div className="hidden sm:flex items-center gap-1 w-24 justify-end">
										{duration !== null && (
											<Badge
												variant="outline"
												className="text-[10px] gap-1 flex items-center"
											>
												<Clock className="size-3" />
												{formatDuration(duration)}
											</Badge>
										)}
									</div>

									<div className="w-20 text-right">
										<Badge
											variant="outline"
											className={`text-[10px] ${STATUS_BADGE[deployment.status || ""] || ""}`}
										>
											{deployment.status}
										</Badge>
									</div>

									<div className="flex items-center gap-2 w-32 justify-end">
										<DateTooltip date={deployment.createdAt} />
										<div className="flex items-center gap-1">
											{deployment.pid && deployment.status === "running" && (
												<DialogAction
													title="Kill Process"
													description="Are you sure you want to kill the process?"
													type="default"
													onClick={async () => {
														await killProcess({
															deploymentId: deployment.deploymentId,
														})
															.then(() => {
																toast.success("Process killed successfully");
															})
															.catch(() => {
																toast.error("Error killing process");
															});
													}}
												>
													<Button
														variant="ghost"
														size="sm"
														isLoading={isKillingProcess}
														className="h-7 px-2"
													>
														Kill
													</Button>
												</DialogAction>
											)}
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setActiveLog(deployment)}
												className="h-7 px-2"
											>
												View
											</Button>
											{(type === "application" || type === "compose") && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														setDetailDeploymentId(deployment.deploymentId)
													}
													className="h-7 px-2"
												>
													Detail
												</Button>
											)}
											{canDelete && (
												<DialogAction
													title="Delete Deployment"
													description="Are you sure you want to delete this deployment? This action cannot be undone."
													type="default"
													onClick={async () => {
														setRemovingDeploymentIds((prev) => {
															const next = new Set(prev);
															next.add(deployment.deploymentId);
															return next;
														});
														try {
															await removeDeployment({
																deploymentId: deployment.deploymentId,
															});
															toast.success("Deployment deleted");
														} catch {
															toast.error("Error deleting deployment");
														} finally {
															setRemovingDeploymentIds((prev) => {
																const next = new Set(prev);
																next.delete(deployment.deploymentId);
																return next;
															});
														}
													}}
												>
													<Button
														variant="ghost"
														size="sm"
														isLoading={removingDeploymentIds.has(
															deployment.deploymentId,
														)}
														className="h-7 px-2"
													>
														<Trash2 className="size-3" />
													</Button>
												</DialogAction>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{isFilterable && totalPages > 1 && (
					<div className="flex items-center justify-between pt-2">
						<span className="text-xs text-muted-foreground">
							Page {page} of {totalPages}
						</span>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<ArrowLeft className="size-3" />
								Prev
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								Next
								<ArrowRight className="size-3" />
							</Button>
						</div>
					</div>
				)}

				<ShowDeployment
					serverId={activeLog?.buildServerId || serverId}
					open={Boolean(activeLog && activeLog.logPath !== null)}
					onClose={() => setActiveLog(null)}
					logPath={activeLog?.logPath || ""}
					errorMessage={activeLog?.errorMessage || ""}
				/>
			</CardContent>
		</Card>
	);
};
