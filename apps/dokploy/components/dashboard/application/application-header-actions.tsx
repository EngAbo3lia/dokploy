import { Ban, CheckCircle2, Hammer, RefreshCcw, Rocket } from "lucide-react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { toast } from "sonner";
import { DialogAction } from "@/components/shared/dialog-action";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/utils/api";
import { UpdateApplication } from "@/components/dashboard/application/update-application";
import { DeleteService } from "@/components/dashboard/compose/delete-service";

interface Props {
	applicationId: string;
}

export const ApplicationHeaderActions = ({ applicationId }: Props) => {
	const { data: permissions } = api.user.getPermissions.useQuery();
	const canDeploy = permissions?.deployment.create ?? false;
	const canUpdateService = permissions?.service.create ?? false;
	const canDeleteService = permissions?.service.delete ?? false;

	const { data, refetch } = api.application.one.useQuery(
		{ applicationId },
		{ enabled: !!applicationId },
	);

	const { mutateAsync: start, isPending: isStarting } =
		api.application.start.useMutation();
	const { mutateAsync: stop, isPending: isStopping } =
		api.application.stop.useMutation();
	const { mutateAsync: deploy, isPending: isDeploying } =
		api.application.deploy.useMutation();
	const { mutateAsync: reload, isPending: isReloading } =
		api.application.reload.useMutation();
	const { mutateAsync: redeploy, isPending: isRedeploying } =
		api.application.redeploy.useMutation();

	return (
		<div className="flex flex-row flex-wrap items-center gap-2">
			<TooltipProvider delayDuration={0} disableHoverableContent={false}>
				{canDeploy && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="default"
								size="sm"
								isLoading={isDeploying}
								className="flex items-center gap-1.5"
								onClick={async () => {
									await deploy({ applicationId })
										.then(() => {
											toast.success("Application deployment triggered");
											refetch();
										})
										.catch((error) => {
											toast.error(error?.message || "Error deploying application");
										});
								}}
							>
								<Rocket className="size-3.5" />
								Deploy
							</Button>
						</TooltipTrigger>
						<TooltipPrimitive.Portal>
							<TooltipContent sideOffset={5} className="z-60">
								<p>Downloads source and performs full build</p>
							</TooltipContent>
						</TooltipPrimitive.Portal>
					</Tooltip>
				)}

				{canDeploy && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="secondary"
								size="sm"
								isLoading={isReloading}
								className="flex items-center gap-1.5"
								onClick={async () => {
									await reload({
										applicationId,
										appName: data?.appName || "",
									})
										.then(() => {
											toast.success("Application reloaded successfully");
											refetch();
										})
										.catch((error) => {
											toast.error(error?.message || "Error reloading application");
										});
								}}
							>
								<RefreshCcw className="size-3.5" />
								Reload
							</Button>
						</TooltipTrigger>
						<TooltipPrimitive.Portal>
							<TooltipContent sideOffset={5} className="z-60">
								<p>Reload application without rebuilding</p>
							</TooltipContent>
						</TooltipPrimitive.Portal>
					</Tooltip>
				)}

				{canDeploy && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="secondary"
								size="sm"
								isLoading={isRedeploying}
								className="flex items-center gap-1.5"
								onClick={async () => {
									await redeploy({ applicationId })
										.then(() => {
											toast.success("Application rebuild triggered");
											refetch();
										})
										.catch((error) => {
											toast.error(error?.message || "Error rebuilding application");
										});
								}}
							>
								<Hammer className="size-3.5" />
								Rebuild
							</Button>
						</TooltipTrigger>
						<TooltipPrimitive.Portal>
							<TooltipContent sideOffset={5} className="z-60">
								<p>Rebuilds without downloading code</p>
							</TooltipContent>
						</TooltipPrimitive.Portal>
					</Tooltip>
				)}

				{canDeploy && data?.applicationStatus === "idle" ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="secondary"
								size="sm"
								isLoading={isStarting}
								className="flex items-center gap-1.5"
								onClick={async () => {
									await start({ applicationId })
										.then(() => {
											toast.success("Application started successfully");
											refetch();
										})
										.catch((error) => {
											toast.error(error?.message || "Error starting application");
										});
								}}
							>
								<CheckCircle2 className="size-3.5" />
								Start
							</Button>
						</TooltipTrigger>
						<TooltipPrimitive.Portal>
							<TooltipContent sideOffset={5} className="z-60">
								<p>Start application container</p>
							</TooltipContent>
						</TooltipPrimitive.Portal>
					</Tooltip>
				) : canDeploy ? (
					<DialogAction
						title="Stop Application"
						description="Are you sure you want to stop this application?"
						type="destructive"
						onClick={async () => {
							await stop({ applicationId })
								.then(() => {
									toast.success("Application stopped successfully");
									refetch();
								})
								.catch((error) => {
									toast.error(error?.message || "Error stopping application");
								});
						}}
					>
						<Button
							variant="destructive"
							size="sm"
							isLoading={isStopping}
							className="flex items-center gap-1.5"
						>
							<Ban className="size-3.5" />
							Stop
						</Button>
					</DialogAction>
				) : null}
			</TooltipProvider>

			{canUpdateService && <UpdateApplication applicationId={applicationId} />}
			{canDeleteService && <DeleteService id={applicationId} type="application" />}
		</div>
	);
};
