import { validateRequest } from "@dokploy/server/lib/auth";
import { createServerSideHelpers } from "@trpc/react-query/server";
import copy from "copy-to-clipboard";
import { ArrowUpRight, Check, Copy, Globe, ServerOff } from "lucide-react";
import type {
	GetServerSidePropsContext,
	InferGetServerSidePropsType,
} from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactElement, useEffect, useState } from "react";
import superjson from "superjson";
import { ShowDeployments } from "@/components/dashboard/application/deployments/show-deployments";
import { ComposeConfigurationTabs } from "@/components/dashboard/compose/compose-configuration-tabs";
import { ComposeOverview } from "@/components/dashboard/compose/compose-overview";
import { DeleteService } from "@/components/dashboard/compose/delete-service";
import { ShowDockerLogsCompose } from "@/components/dashboard/compose/logs/show";
import { ShowDockerLogsStack } from "@/components/dashboard/compose/logs/show-stack";
import { ShowIconSettings } from "@/components/dashboard/application/icon/show-icon-settings";
import { UpdateCompose } from "@/components/dashboard/compose/update-compose";
import { ServicePageHeader } from "@/components/dashboard/service/service-page-header";
import { ServicePageShell } from "@/components/dashboard/service/service-page-shell";
import { ServiceTabs } from "@/components/dashboard/service/service-tabs";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { AdvanceBreadcrumb } from "@/components/shared/advance-breadcrumb";
import {
	mapServiceStatus,
	StatusBadge,
	StatusDot,
} from "@/components/shared/status-indicator";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { UseKeyboardNav } from "@/hooks/use-keyboard-nav";
import { appRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import { useWhitelabeling } from "@/utils/hooks/use-whitelabeling";

type TabState = "overview" | "configuration" | "deployments" | "logs";

const Service = (
	props: InferGetServerSidePropsType<typeof getServerSideProps>,
) => {
	const { composeId, activeTab } = props;
	const router = useRouter();
	const { projectId, environmentId } = router.query;
	const [tab, setTab] = useState<TabState>(activeTab);

	useEffect(() => {
		if (router.query.tab) {
			setTab(router.query.tab as TabState);
		}
	}, [router.query.tab]);

	const { data } = api.compose.one.useQuery({ composeId });

	const { data: permissions } = api.user.getPermissions.useQuery();
	const canReadDeployments = !!permissions?.deployment.read;
	const canReadDomains = !!permissions?.domain.read;

	const { data: deployments } = api.deployment.allByCompose.useQuery(
		{
			composeId,
		},
		{
			enabled: canReadDeployments,
			refetchInterval: canReadDeployments ? 5000 : false,
		},
	);
	const { data: serviceDomains } = api.domain.byComposeId.useQuery(
		{ composeId },
		{
			enabled: canReadDomains,
			refetchInterval: canReadDomains ? 10000 : false,
		},
	);
	const latestLiveDeployment = deployments
		?.filter((d) => d.status === "done")
		.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
	const latestDeployment = deployments?.sort((a, b) =>
		(b.createdAt || "").localeCompare(a.createdAt || ""),
	)[0];
	const isDeploying = ["running", "queued"].includes(
		latestDeployment?.status || "",
	);
	const [appNameCopied, setAppNameCopied] = useState(false);

	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: serverIp } = api.settings.getIp.useQuery();
	const { config: whitelabeling } = useWhitelabeling();
	const appName = whitelabeling?.appName || "Dokploy";

	return (
		<div className="pb-10">
			<UseKeyboardNav forPage="compose" />
			<AdvanceBreadcrumb />
			<Head>
				<title>
					Compose: {data?.name} - {data?.environment?.project?.name} | {appName}
				</title>
			</Head>
			<ServicePageShell>
				<ServicePageHeader
					icon={
						<ShowIconSettings
							serviceId={composeId}
							serviceType="compose"
							icon={data?.icon}
						/>
					}
					statusDot={
						<StatusDot status={mapServiceStatus(data?.composeStatus)} />
					}
					title={data?.name || ""}
					titleSub={
						<button
							type="button"
							className="flex w-fit flex-row items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
							title="Copy compose project name"
							onClick={() => {
								copy(data?.appName || "");
								setAppNameCopied(true);
								setTimeout(() => setAppNameCopied(false), 1500);
							}}
						>
							{data?.appName}
							{appNameCopied ? (
								<Check className="size-3 text-success" />
							) : (
								<Copy className="size-3 opacity-50" />
							)}
						</button>
					}
					description={data?.description ?? undefined}
					badges={
						<>
							{latestLiveDeployment && (
								<StatusBadge
									status="success"
									title={`Last successful deploy: ${latestLiveDeployment?.createdAt}`}
								>
									Live
								</StatusBadge>
							)}
							{isDeploying && (
								<StatusBadge status="deploying">Deploying</StatusBadge>
							)}
							{latestDeployment?.status === "error" && latestLiveDeployment && (
								<StatusBadge
									status="error"
									title="The last deployment failed. The previous successful deployment is still serving traffic."
								>
									Deploy failed
								</StatusBadge>
							)}
							{latestDeployment?.status === "error" && !latestLiveDeployment && (
								<StatusBadge
									status="error"
									title="The last deployment failed and no previous successful deployment exists."
								>
									Deploy failed
								</StatusBadge>
							)}
							{!latestDeployment && (
								<Badge variant="secondary" className="text-muted-foreground">
									No deployments yet
								</Badge>
							)}
						</>
					}
					serverName={data?.server?.name || "Dokploy Server"}
					ipAddress={data?.server?.ipAddress ?? null}
					serverStatus={data?.server?.serverStatus || "active"}
					fallbackIp={serverIp}
					actions={
						<>
							{permissions?.service.create && (
								<UpdateCompose composeId={composeId} />
							)}
							{permissions?.service.delete && (
								<DeleteService id={composeId} type="compose" />
							)}
						</>
					}
				/>
				{(serviceDomains?.length ?? 0) > 0 && (
					<div className="flex flex-wrap items-center gap-2 px-6 pb-5">
						<Globe className="size-3.5 text-muted-foreground" />
						{serviceDomains?.map((domain) => (
							<a
								key={domain.domainId}
								href={`http${domain.https ? "s" : ""}://${domain.host}`}
								target="_blank"
								rel="noreferrer"
								className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
									domain.enabled
										? "border-border bg-accent hover:border-primary/40 hover:bg-primary/10"
										: "border-border bg-muted/40 text-muted-foreground line-through opacity-70"
								}`}
							>
								<ArrowUpRight className="size-3" />
								{domain.host}
							</a>
						))}
					</div>
				)}
				<CardContent className="space-y-2 border-t py-8">
					{data?.server?.serverStatus === "inactive" ? (
						<div className="flex h-[55vh] rounded-xl border-2 border-dashed p-4">
							<div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 self-center">
								<ServerOff className="size-10 self-center text-muted-foreground" />
								<span className="text-center text-base text-muted-foreground">
									This service is hosted on the server {data.server.name}, but
									this server has been disabled because your current plan
									doesn't include enough servers. Please purchase more servers
									to regain access to this application.
								</span>
								<span className="text-center text-base text-muted-foreground">
									Go to{" "}
									<Link
										href="/dashboard/settings/billing"
										className="text-primary"
									>
										Billing
									</Link>
								</span>
							</div>
						</div>
					) : (
						<ServiceTabs
							value={tab}
							onValueChange={(e) => {
								setTab(e as TabState);
								const newPath = `/dashboard/project/${projectId}/environment/${environmentId}/services/compose/${composeId}?tab=${e}`;
								router.push(newPath);
							}}
							tabs={[
								{ value: "overview", label: "Overview" },
								...(canReadDeployments
									? [{ value: "deployments" as TabState, label: "Deployments" }]
									: []),
								...(permissions?.logs.read
									? [{ value: "logs" as TabState, label: "Logs" }]
									: []),
								{ value: "configuration", label: "Configuration" },
							]}
						>
							<TabsContent value="overview">
								<div className="flex flex-col gap-4 pt-2.5">
									<ComposeOverview
										composeId={composeId}
										name={data?.name || ""}
										description={data?.description || null}
										composeStatus={data?.composeStatus || null}
										composeType={data?.composeType || "docker-compose"}
										sourceType={data?.sourceType || "raw"}
										serverId={data?.serverId || ""}
										serverName={data?.server?.name || null}
										appName={data?.appName || ""}
										canDeploy={!!permissions?.service.create}
										canReadDomains={canReadDomains}
										canReadDeployments={canReadDeployments}
									/>
								</div>
							</TabsContent>
							<TabsContent value="configuration">
								<div className="flex flex-col gap-4 pt-2.5">
									<ComposeConfigurationTabs
										composeId={composeId}
										sourceType={data?.sourceType || "raw"}
										composeType={data?.composeType || "docker-compose"}
										appName={data?.appName || ""}
										serverId={data?.serverId || ""}
										server={
											data?.server
												? {
														ipAddress: data.server.ipAddress,
														metricsConfig: {
															server: {
																port: data.server.metricsConfig?.server?.port,
																token: data.server.metricsConfig?.server?.token,
															},
														},
													}
												: null
										}
										refreshToken={data?.refreshToken || ""}
									/>
								</div>
							</TabsContent>
							{permissions?.logs.read && (
								<TabsContent value="logs">
									<div className="flex flex-col gap-4 pt-2.5">
										{data?.composeType === "docker-compose" ? (
											<ShowDockerLogsCompose
												serverId={data?.serverId || ""}
												appName={data?.appName || ""}
												appType={data?.composeType || "docker-compose"}
												serviceId={data?.composeId}
											/>
										) : (
											<ShowDockerLogsStack
												serverId={data?.serverId || ""}
												appName={data?.appName || ""}
												serviceId={data?.composeId}
											/>
										)}
									</div>
								</TabsContent>
							)}
							{canReadDeployments && (
								<TabsContent value="deployments" className="w-full pt-2.5">
									<div className="flex flex-col gap-4 rounded-lg border">
										<ShowDeployments
											id={composeId}
											type="compose"
											serverId={data?.serverId || ""}
											refreshToken={data?.refreshToken || ""}
										/>
									</div>
								</TabsContent>
							)}
						</ServiceTabs>
					)}
				</CardContent>
			</ServicePageShell>
		</div>
	);
};

export default Service;
Service.getLayout = (page: ReactElement) => {
	return <DashboardLayout>{page}</DashboardLayout>;
};

export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{
		composeId: string;
		activeTab: TabState;
		environmentId: string;
	}>,
) {
	const { query, params, req, res } = ctx;

	const activeTab = query.tab;
	const { user, session } = await validateRequest(req);
	if (!user) {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}
	// Fetch data from external API
	const helpers = createServerSideHelpers({
		router: appRouter,
		ctx: {
			req: req as any,
			res: res as any,
			db: null as any,
			session: session as any,
			user: user as any,
		},
		transformer: superjson,
	});

	// Valid project, if not return to initial homepage....
	if (typeof params?.composeId === "string") {
		try {
			await helpers.compose.one.fetch({
				composeId: params?.composeId,
			});
			await helpers.settings.isCloud.prefetch();
			return {
				props: {
					trpcState: helpers.dehydrate(),
					composeId: params?.composeId,
					activeTab: (activeTab || "overview") as TabState,
					environmentId: params?.environmentId,
				},
			};
		} catch {
			return {
				redirect: {
					permanent: false,
					destination: "/dashboard/home",
				},
			};
		}
	}

	return {
		redirect: {
			permanent: false,
			destination: "/",
		},
	};
}
