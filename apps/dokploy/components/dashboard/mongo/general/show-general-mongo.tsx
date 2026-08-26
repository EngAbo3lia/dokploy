import { Ban, CheckCircle2, RefreshCcw, Rocket, Terminal } from "lucide-react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { useState } from "react";
import { toast } from "sonner";
import { DialogAction } from "@/components/shared/dialog-action";
import { DrawerLogs } from "@/components/shared/drawer-logs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/utils/api";
import { type LogLine, parseLogs } from "../../docker/logs/utils";
import { DockerTerminalModal } from "../../settings/web-server/docker-terminal-modal";

interface Props {
	mongoId: string;
}

export const ShowGeneralMongo = ({ mongoId }: Props) => {
	const { data: permissions } = api.user.getPermissions.useQuery();
	const canDeploy = permissions?.deployment.create ?? false;
	const { data, refetch } = api.mongo.one.useQuery(
		{
			mongoId,
		},
		{ enabled: !!mongoId },
	);

	const { mutateAsync: reload, isPending: isReloading } =
		api.mongo.reload.useMutation();

	const { mutateAsync: start, isPending: isStarting } =
		api.mongo.start.useMutation();

	const { mutateAsync: stop, isPending: isStopping } =
		api.mongo.stop.useMutation();

	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [filteredLogs, setFilteredLogs] = useState<LogLine[]>([]);
	const [isDeploying, setIsDeploying] = useState(false);
	api.mongo.deployWithLogs.useSubscription(
		{
			mongoId: mongoId,
		},
		{
			enabled: isDeploying,
			onData(log) {
				if (!isDrawerOpen) {
					setIsDrawerOpen(true);
				}

				if (log === "Deployment completed successfully!") {
					setIsDeploying(false);
				}

				const parsedLogs = parseLogs(log);
				setFilteredLogs((prev) => [...prev, ...parsedLogs]);
			},
			onError(error) {
				console.error("Deployment logs error:", error);
				setIsDeploying(false);
			},
		},
	);
	return (
		<>
			<div className="flex w-full flex-col gap-5 ">
				<Card className="bg-background">
					<CardHeader>
						<CardTitle className="text-xl">Deploy Settings</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-row gap-4 flex-wrap">
						<TooltipProvider delayDuration={0}>
							{canDeploy && (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="default"
											isLoading={isDeploying}
											className="flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
											onClick={async () => {
												setIsDeploying(true);
												await new Promise((resolve) =>
													setTimeout(resolve, 1000),
												);
												refetch();
											}}
										>
											<Rocket className="size-4 mr-1" />
											Deploy
										</Button>
									</TooltipTrigger>
									<TooltipPrimitive.Portal>
										<TooltipContent sideOffset={5} className="z-60">
											<p>Downloads and sets up the MongoDB database</p>
										</TooltipContent>
									</TooltipPrimitive.Portal>
								</Tooltip>
							)}
							{canDeploy && (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="secondary"
											isLoading={isReloading}
											className="flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
											onClick={async () => {
												await reload({
													mongoId: mongoId,
													appName: data?.appName || "",
												})
													.then(() => {
														toast.success("Mongo reloaded successfully");
														refetch();
													})
													.catch((error) => {
														toast.error(
															error?.message || "Error reloading Mongo",
														);
													});
											}}
										>
											<RefreshCcw className="size-4 mr-1" />
											Reload
										</Button>
									</TooltipTrigger>
									<TooltipPrimitive.Portal>
										<TooltipContent sideOffset={5} className="z-60">
											<p>Restart the MongoDB service without rebuilding</p>
										</TooltipContent>
									</TooltipPrimitive.Portal>
								</Tooltip>
							)}
							{canDeploy &&
								(data?.applicationStatus === "idle" ? (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="secondary"
												isLoading={isStarting}
												className="flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
												onClick={async () => {
													await start({
														mongoId: mongoId,
													})
														.then(() => {
															toast.success("Mongo started successfully");
															refetch();
														})
														.catch((error) => {
															toast.error(
																error?.message || "Error starting Mongo",
															);
														});
												}}
											>
												<CheckCircle2 className="size-4 mr-1" />
												Start
											</Button>
										</TooltipTrigger>
										<TooltipPrimitive.Portal>
											<TooltipContent sideOffset={5} className="z-60">
												<p>
													Start the MongoDB database (requires a previous
													successful setup)
												</p>
											</TooltipContent>
										</TooltipPrimitive.Portal>
									</Tooltip>
								) : (
									<DialogAction
										title="Stop Mongo"
										description="Are you sure you want to stop this mongo?"
										onClick={async () => {
											await stop({
												mongoId: mongoId,
											})
												.then(() => {
													toast.success("Mongo stopped successfully");
													refetch();
												})
												.catch((error) => {
													toast.error(error?.message || "Error stopping Mongo");
												});
										}}
									>
										<Button
											variant="destructive"
											isLoading={isStopping}
											className="flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
										>
											<Tooltip>
												<TooltipTrigger asChild>
													<div className="flex items-center">
														<Ban className="size-4 mr-1" />
														Stop
													</div>
												</TooltipTrigger>
												<TooltipPrimitive.Portal>
													<TooltipContent sideOffset={5} className="z-60">
														<p>Stop the currently running MongoDB database</p>
													</TooltipContent>
												</TooltipPrimitive.Portal>
											</Tooltip>
										</Button>
									</DialogAction>
								))}
						</TooltipProvider>
						<DockerTerminalModal
							appName={data?.appName || ""}
							serviceId={data?.mongoId}
							serverId={data?.serverId || ""}
						>
							<Button
								variant="outline"
								className="flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
							>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center">
											<Terminal className="size-4 mr-1" />
											Open Terminal
										</div>
									</TooltipTrigger>
									<TooltipPrimitive.Portal>
										<TooltipContent sideOffset={5} className="z-60">
											<p>Open a terminal to the MongoDB container</p>
										</TooltipContent>
									</TooltipPrimitive.Portal>
								</Tooltip>
							</Button>
						</DockerTerminalModal>
					</CardContent>
				</Card>
				<DrawerLogs
					isOpen={isDrawerOpen}
					onClose={() => {
						setIsDrawerOpen(false);
						setFilteredLogs([]);
						setIsDeploying(false);
						refetch();
					}}
					filteredLogs={filteredLogs}
				/>
			</div>
		</>
	);
};
