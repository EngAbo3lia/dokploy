import { validateRequest } from "@dokploy/server/lib/auth";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { ServerOff } from "lucide-react";
import type {
	GetServerSidePropsContext,
	InferGetServerSidePropsType,
} from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactElement, useEffect, useState } from "react";
import superjson from "superjson";
import { ShowClusterSettings } from "@/components/dashboard/application/advanced/cluster/show-cluster-settings";
import { AddCommand } from "@/components/dashboard/application/advanced/general/add-command";
import { ShowPorts } from "@/components/dashboard/application/advanced/ports/show-port";
import { ShowRedirects } from "@/components/dashboard/application/advanced/redirects/show-redirects";
import { ShowSecurity } from "@/components/dashboard/application/advanced/security/show-security";
import { ShowBuildServer } from "@/components/dashboard/application/advanced/show-build-server";
import { ShowResources } from "@/components/dashboard/application/advanced/show-resources";
import { ShowTraefikConfig } from "@/components/dashboard/application/advanced/traefik/show-traefik-config";
import { ShowVolumes } from "@/components/dashboard/application/advanced/volumes/show-volumes";
import { ShowDeployments } from "@/components/dashboard/application/deployments/show-deployments";
import { ShowDomains } from "@/components/dashboard/application/domains/show-domains";
import { ShowEnvironment } from "@/components/dashboard/application/environment/show";
import { ShowGeneralApplication } from "@/components/dashboard/application/general/show";
import { ShowIconSettings } from "@/components/dashboard/application/icon/show-icon-settings";
import { ShowDockerLogs } from "@/components/dashboard/application/logs/show";
import { ShowPatches } from "@/components/dashboard/application/patches/show-patches";
import { ShowPreviewDeployments } from "@/components/dashboard/application/preview-deployments/show-preview-deployments";
import { ApplicationCommandCenter } from "@/components/dashboard/application/application-command-center";
import { ShowSchedules } from "@/components/dashboard/application/schedules/show-schedules";
import { ApplicationHeaderActions } from "@/components/dashboard/application/application-header-actions";
import { UpdateApplication } from "@/components/dashboard/application/update-application";
import { ShowVolumeBackups } from "@/components/dashboard/application/volume-backups/show-volume-backups";
import { DeleteService } from "@/components/dashboard/compose/delete-service";
import { ContainerFreeMonitoring } from "@/components/dashboard/monitoring/free/container/show-free-container-monitoring";
import { ContainerPaidMonitoring } from "@/components/dashboard/monitoring/paid/container/show-paid-container-monitoring";
import { AssignNetworks } from "@/components/dashboard/networks/assign-networks";
import { ServicePageHeader } from "@/components/dashboard/service/service-page-header";
import { ServicePageShell } from "@/components/dashboard/service/service-page-shell";
import { ServiceTabs } from "@/components/dashboard/service/service-tabs";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { AdvanceBreadcrumb } from "@/components/shared/advance-breadcrumb";
import {
	mapServiceStatus,
	StatusDot,
} from "@/components/shared/status-indicator";
import { CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { UseKeyboardNav } from "@/hooks/use-keyboard-nav";
import { appRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import { useWhitelabeling } from "@/utils/hooks/use-whitelabeling";

type TabState =
	| "general"
	| "environment"
	| "domains"
	| "deployments"
	| "preview-deployments"
	| "schedules"
	| "volume-backups"
	| "logs"
	| "patches"
	| "monitoring"
	| "advanced";

const Service = (
	props: InferGetServerSidePropsType<typeof getServerSideProps>,
) => {
	const { applicationId, activeTab } = props;
	const router = useRouter();
	const { projectId, environmentId } = router.query;
	const [tab, setTab] = useState<TabState>(activeTab);

	useEffect(() => {
		if (router.query.tab) {
			setTab(router.query.tab as TabState);
		}
	}, [router.query.tab]);

	const { data } = api.application.one.useQuery(
		{ applicationId },
		{
			refetchInterval: 5000,
		},
	);

	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: serverIp } = api.settings.getIp.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const { config: whitelabeling } = useWhitelabeling();
	const appName = whitelabeling?.appName || "Dokploy";

	return (
		<div className="pb-10">
			<UseKeyboardNav forPage="application" />
			<AdvanceBreadcrumb />
			<Head>
				<title>
					Application: {data?.name} - {data?.environment.project.name} |{" "}
					{appName}
				</title>
			</Head>
			<ServicePageShell>
				<ServicePageHeader
					icon={
						<ShowIconSettings
							serviceId={applicationId}
							serviceType="application"
							icon={data?.icon}
						/>
					}
					statusDot={
						<StatusDot status={mapServiceStatus(data?.applicationStatus)} />
					}
					title={data?.name || ""}
					titleSub={
						data?.appName ? (
							<span className="text-sm text-muted-foreground">
								{data.appName}
							</span>
						) : undefined
					}
					description={data?.description ?? undefined}
					serverName={data?.server?.name || "Dokploy Server"}
					ipAddress={data?.server?.ipAddress ?? null}
					serverStatus={data?.server?.serverStatus || "active"}
					fallbackIp={serverIp}
					actions={<ApplicationHeaderActions applicationId={applicationId} />}
				/>
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
								const newPath = `/dashboard/project/${projectId}/environment/${environmentId}/services/application/${applicationId}?tab=${e}`;
								router.push(newPath);
							}}
							tabs={[
								{ value: "general", label: "General" },
								...(permissions?.envVars.read
									? [{ value: "environment" as TabState, label: "Environment" }]
									: []),
								...(permissions?.domain.read
									? [{ value: "domains" as TabState, label: "Domains" }]
									: []),
								...(permissions?.deployment.read
									? [{ value: "deployments" as TabState, label: "Deployments" }]
									: []),
								...(permissions?.deployment.read
									? [
											{
												value: "preview-deployments" as TabState,
												label: "Preview Deployments",
											},
										]
									: []),
								...(permissions?.schedule.read
									? [{ value: "schedules" as TabState, label: "Schedules" }]
									: []),
								...(permissions?.volumeBackup.read
									? [
											{
												value: "volume-backups" as TabState,
												label: "Volume Backups",
											},
										]
									: []),
								...(permissions?.logs.read
									? [{ value: "logs" as TabState, label: "Logs" }]
									: []),
								...(data?.sourceType !== "docker"
									? [{ value: "patches" as TabState, label: "Patches" }]
									: []),
								...(permissions?.monitoring.read &&
								((data?.serverId && isCloud) || !data?.server)
									? [{ value: "monitoring" as TabState, label: "Monitoring" }]
									: []),
								...(permissions?.service.create
									? [{ value: "advanced" as TabState, label: "Advanced" }]
									: []),
							]}
						>
							<TabsContent value="general">
								<div className="flex flex-col gap-6 pt-2.5">
									<ApplicationCommandCenter
										applicationId={applicationId}
										onTabChange={(t) => {
											setTab(t as TabState);
											const newPath = `/dashboard/project/${projectId}/environment/${environmentId}/services/application/${applicationId}?tab=${t}`;
											router.push(newPath);
										}}
									/>
									<ShowGeneralApplication applicationId={applicationId} />
								</div>
							</TabsContent>
							{permissions?.envVars.read && (
								<TabsContent value="environment">
									<div className="flex flex-col gap-4 pt-2.5">
										<ShowEnvironment applicationId={applicationId} />
									</div>
								</TabsContent>
							)}
							{permissions?.monitoring.read && (
								<TabsContent value="monitoring">
									<div className="pt-2.5">
										<div className="flex flex-col gap-4 rounded-lg border p-6">
											{data?.serverId && isCloud ? (
												<ContainerPaidMonitoring
													appName={data?.appName || ""}
													baseUrl={`${data?.serverId ? `http://${data?.server?.ipAddress}:${data?.server?.metricsConfig?.server?.port}` : "http://localhost:4500"}`}
													token={
														data?.server?.metricsConfig?.server?.token || ""
													}
												/>
											) : (
												<div>
													<ContainerFreeMonitoring
														appName={data?.appName || ""}
													/>
												</div>
											)}
										</div>
									</div>
								</TabsContent>
							)}
							{permissions?.logs.read && (
								<TabsContent value="logs">
									<div className="flex flex-col gap-4 pt-2.5">
										<ShowDockerLogs
											appName={data?.appName || ""}
											serverId={data?.serverId || ""}
											serviceId={data?.applicationId}
										/>
									</div>
								</TabsContent>
							)}
							{permissions?.schedule.read && (
								<TabsContent value="schedules">
									<div className="flex flex-col gap-4 pt-2.5">
										<ShowSchedules
											id={applicationId}
											scheduleType="application"
										/>
									</div>
								</TabsContent>
							)}
							{permissions?.deployment.read && (
								<TabsContent value="deployments" className="w-full pt-2.5">
									<div className="flex flex-col gap-4">
										<ShowDeployments
											id={applicationId}
											type="application"
											serverId={data?.serverId || ""}
											refreshToken={data?.refreshToken || ""}
										/>
									</div>
								</TabsContent>
							)}
							{permissions?.volumeBackup.read && (
								<TabsContent value="volume-backups" className="w-full pt-2.5">
									<div className="flex flex-col gap-4">
										<ShowVolumeBackups
											id={applicationId}
											type="application"
											serverId={data?.serverId || ""}
										/>
									</div>
								</TabsContent>
							)}
							{permissions?.deployment.read && (
								<TabsContent value="preview-deployments" className="w-full">
									<div className="flex flex-col gap-4 pt-2.5">
										<ShowPreviewDeployments applicationId={applicationId} />
									</div>
								</TabsContent>
							)}
							{permissions?.domain.read && (
								<TabsContent value="domains" className="w-full">
									<div className="flex flex-col gap-4 pt-2.5">
										<ShowDomains id={applicationId} type="application" />
									</div>
								</TabsContent>
							)}
							<TabsContent value="patches" className="w-full">
								<div className="flex flex-col gap-4 pt-2.5">
									<ShowPatches id={applicationId} type="application" />
								</div>
							</TabsContent>
							{permissions?.service.create && (
								<TabsContent value="advanced">
									<div className="flex flex-col gap-4 pt-2.5">
										<AddCommand applicationId={applicationId} />
										<ShowClusterSettings
											id={applicationId}
											type="application"
										/>
										<ShowBuildServer applicationId={applicationId} />
										<ShowResources id={applicationId} type="application" />
										<ShowVolumes id={applicationId} type="application" />
										<AssignNetworks id={applicationId} type="application" />
										<ShowRedirects applicationId={applicationId} />
										<ShowSecurity applicationId={applicationId} />
										<ShowPorts applicationId={applicationId} />
										<ShowTraefikConfig applicationId={applicationId} />
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
		applicationId: string;
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
	if (typeof params?.applicationId === "string") {
		try {
			await helpers.application.one.fetch({
				applicationId: params?.applicationId,
			});

			await helpers.settings.isCloud.prefetch();

			return {
				props: {
					trpcState: helpers.dehydrate(),
					applicationId: params?.applicationId,
					activeTab: (activeTab || "general") as TabState,
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
