import {
	ArrowBigUp,
	ArrowLeft,
	ExternalLink,
	GitBranch,
	GitCommitHorizontal,
	Search,
	User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DeploymentStatus } from "@/components/shared/status-indicator";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonCard } from "@/components/shared/skeleton-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/api";
import { DeploymentTimeline } from "./deployment-timeline";

interface Props {
	deploymentId: string;
	onBack: () => void;
}

export const DeploymentDetail = ({ deploymentId, onBack }: Props) => {
	const utils = api.useUtils();
	const [isPromoting, setIsPromoting] = useState(false);

	const { data: deployment, isPending } = api.deployment.detail.useQuery(
		{ deploymentId },
		{ enabled: !!deploymentId },
	);

	const { mutateAsync: promote } = api.deployment.promote.useMutation();

	const handlePromote = async () => {
		if (!deployment) return;
		setIsPromoting(true);
		try {
			await promote({ deploymentId });
			toast.success("Deployment promoted to production");
			utils.deployment.detail.invalidate({ deploymentId });
		} catch {
			toast.error("Failed to promote deployment");
		} finally {
			setIsPromoting(false);
		}
	};

	if (isPending) {
		return (
			<div className="flex flex-col gap-4">
				<SkeletonCard />
			</div>
		);
	}

	if (!deployment) {
		return (
			<EmptyState
				icon={<Search />}
				title="Deployment not found"
				description="This deployment may have been deleted."
			/>
		);
	}

	const duration =
		deployment.startedAt && deployment.finishedAt
			? Math.floor(
					(new Date(deployment.finishedAt).getTime() -
						new Date(deployment.startedAt).getTime()) /
						1000,
				)
			: null;

	const formatDuration = (s: number) => {
		if (s < 60) return `${s}s`;
		const m = Math.floor(s / 60);
		return `${m}m ${s % 60}s`;
	};

	return (
		<div className="flex flex-col gap-5 sm:gap-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
				<Button variant="ghost" size="sm" onClick={onBack}>
					<ArrowLeft className="mr-1 size-4" />
					Back
				</Button>
				<h2 className="text-lg font-semibold leading-tight">
					{deployment.title}
				</h2>
				<DeploymentStatus status={deployment.status || "idle"} />
				{deployment.environment && (
					<Badge variant="secondary">{deployment.environment}</Badge>
				)}
			</div>

			<div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
				<div className="flex flex-col gap-5 lg:col-span-2 lg:gap-6">
					<Card className="bg-background">
						<CardHeader>
							<CardTitle className="text-base">Build Timeline</CardTitle>
						</CardHeader>
						<CardContent>
							<DeploymentTimeline deployment={deployment} />
						</CardContent>
					</Card>

					{deployment.errorMessage && (
						<Card className="bg-background">
							<CardHeader>
								<CardTitle className="text-base">Build Logs</CardTitle>
							</CardHeader>
							<CardContent>
								<pre className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-mono text-xs">
									{deployment.errorMessage}
								</pre>
							</CardContent>
						</Card>
					)}
				</div>

				<div className="flex flex-col gap-5 lg:gap-6">
					<Card className="bg-background">
						<CardHeader>
							<CardTitle className="text-base">Details</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="flex flex-col gap-1.5">
								<span className="text-xs text-muted-foreground">Created</span>
								<DateTooltip date={deployment.createdAt} />
							</div>
							{deployment.startedAt && (
								<div className="flex flex-col gap-1.5">
									<span className="text-xs text-muted-foreground">Started</span>
									<DateTooltip date={deployment.startedAt} />
								</div>
							)}
							{deployment.finishedAt && (
								<div className="flex flex-col gap-1.5">
									<span className="text-xs text-muted-foreground">
										Finished
									</span>
									<DateTooltip date={deployment.finishedAt} />
								</div>
							)}
							{duration !== null && (
								<div className="flex flex-col gap-1.5">
									<span className="text-xs text-muted-foreground">
										Duration
									</span>
									<span className="text-sm">{formatDuration(duration)}</span>
								</div>
							)}
							{deployment.errorMessage && (
								<div className="flex flex-col gap-1.5">
									<span className="text-xs text-red-500">Error</span>
									<span className="whitespace-pre-wrap text-sm text-red-500">
										{deployment.errorMessage}
									</span>
								</div>
							)}
						</CardContent>
					</Card>

					{(deployment.gitBranch || deployment.gitCommitSha) && (
						<Card className="bg-background">
							<CardHeader>
								<CardTitle className="text-base">Git</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								{deployment.gitBranch && (
									<div className="flex items-center gap-2 text-sm">
										<GitBranch className="size-4 text-muted-foreground" />
										<span className="font-mono">{deployment.gitBranch}</span>
									</div>
								)}
								{deployment.gitCommitSha && (
									<div className="flex items-center gap-2 text-sm">
										<GitCommitHorizontal className="size-4 text-muted-foreground" />
										<span className="font-mono text-xs">
											{deployment.gitCommitSha.slice(0, 7)}
										</span>
									</div>
								)}
								{deployment.gitCommitMessage && (
									<p className="text-sm text-muted-foreground">
										{deployment.gitCommitMessage}
									</p>
								)}
								{deployment.gitAuthor && (
									<div className="flex items-center gap-2 text-sm">
										<User className="size-4 text-muted-foreground" />
										<span>{deployment.gitAuthor}</span>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{deployment.deployUrl && (
						<Card className="bg-background">
							<CardHeader>
								<CardTitle className="text-base">URL</CardTitle>
							</CardHeader>
							<CardContent>
								<a
									href={deployment.deployUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2 break-all text-sm text-primary hover:underline"
								>
									{deployment.deployUrl}
									<ExternalLink className="size-3 shrink-0" />
								</a>
							</CardContent>
						</Card>
					)}

					{deployment.status === "done" &&
						deployment.environment !== "production" && (
							<Button
								onClick={handlePromote}
								disabled={isPromoting}
								className="w-full"
							>
								<ArrowBigUp className="mr-2 size-4" />
								{isPromoting ? "Promoting..." : "Promote to Production"}
							</Button>
						)}
				</div>
			</div>
		</div>
	);
};
