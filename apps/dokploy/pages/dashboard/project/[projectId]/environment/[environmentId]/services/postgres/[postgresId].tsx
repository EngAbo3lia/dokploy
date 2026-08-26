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
import { type ReactElement, useState } from "react";
import superjson from "superjson";
import { ShowEnvironment } from "@/components/dashboard/application/environment/show-environment";
import { ShowDockerLogs } from "@/components/dashboard/application/logs/show";
import { DeleteService } from "@/components/dashboard/compose/delete-service";
import { ShowBackups } from "@/components/dashboard/database/backups/show-backups";
import { ContainerFreeMonitoring } from "@/components/dashboard/monitoring/free/container/show-free-container-monitoring";
import { ContainerPaidMonitoring } from "@/components/dashboard/monitoring/paid/container/show-paid-container-monitoring";
import { ShowExternalPostgresCredentials } from "@/components/dashboard/postgres/general/show-external-postgres-credentials";
import { ShowGeneralPostgres } from "@/components/dashboard/postgres/general/show-general-postgres";
import { ShowInternalPostgresCredentials } from "@/components/dashboard/postgres/general/show-internal-postgres-credentials";
import { UpdatePostgres } from "@/components/dashboard/postgres/update-postgres";
import { ServicePageHeader } from "@/components/dashboard/service/service-page-header";
import { ServicePageShell } from "@/components/dashboard/service/service-page-shell";
import { ServiceTabs } from "@/components/dashboard/service/service-tabs";
import { ShowDatabaseAdvancedSettings } from "@/components/dashboard/shared/show-database-advanced-settings";
import { PostgresqlIcon } from "@/components/icons/data-tools-icons";
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
	| "logs"
	| "monitoring"
	| "backups"
	| "advanced";

const Postgresql = (
	props: InferGetServerSidePropsType<typeof getServerSideProps>,
) => {
	const { postgresId, activeTab } = props;
	const router = useRouter();
	const { projectId, environmentId } = router.query;
	const [tab, setTab] = useState<TabState>(activeTab);
	const { data } = api.postgres.one.useQuery({ postgresId });
	const { data: permissions } = api.user.getPermissions.useQuery();

	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: serverIp } = api.settings.getIp.useQuery();
	const { config: whitelabeling } = useWhitelabeling();
	const appName = whitelabeling?.appName || "Dokploy";

	return (
		<div className="pb-10">
			<UseKeyboardNav forPage="postgres" />
			<AdvanceBreadcrumb />
			<Head>
				<title>
					Database: {data?.name} - {data?.environment?.project?.name} |{" "}
					{appName}
				</title>
			</Head>
			<ServicePageShell>
				<ServicePageHeader
					icon={<PostgresqlIcon className="h-6 w-6 text-muted-foreground" />}
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
					actions={
						<>
							{permissions?.service.create && (
								<UpdatePostgres postgresId={postgresId} />
							)}
							{permissions?.service.delete && (
								<DeleteService id={postgresId} type="postgres" />
							)}
						</>
					}
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
								const newPath = `/dashboard/project/${projectId}/environment/${environmentId}/services/postgres/${postgresId}?tab=${e}`;
								router.push(newPath, undefined, { shallow: true });
							}}
							tabs={[
								{ value: "general", label: "General" },
								...(permissions?.envVars.read
									? [{ value: "environment" as TabState, label: "Environment" }]
									: []),
								...(permissions?.logs.read
									? [{ value: "logs" as TabState, label: "Logs" }]
									: []),
								...(permissions?.monitoring.read &&
								((data?.serverId && isCloud) || !data?.server)
									? [
											{
												value: "monitoring" as TabState,
												label: "Monitoring",
											},
										]
									: []),
								{ value: "backups", label: "Backups" },
								...(permissions?.service.create
									? [{ value: "advanced" as TabState, label: "Advanced" }]
									: []),
							]}
						>
							<TabsContent value="general">
								<div className="flex flex-col gap-4 pt-2.5">
									<ShowGeneralPostgres postgresId={postgresId} />
									<ShowInternalPostgresCredentials postgresId={postgresId} />
									<ShowExternalPostgresCredentials postgresId={postgresId} />
								</div>
							</TabsContent>
							{permissions?.envVars.read && (
								<TabsContent value="environment">
									<div className="flex flex-col gap-4 pt-2.5">
										<ShowEnvironment id={postgresId} type="postgres" />
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
													baseUrl={`${
														data?.serverId
															? `http://${data?.server?.ipAddress}:${data?.server?.metricsConfig?.server?.port}`
															: "http://localhost:4500"
													}`}
													token={
														data?.server?.metricsConfig?.server?.token || ""
													}
												/>
											) : (
												<ContainerFreeMonitoring
													appName={data?.appName || ""}
												/>
											)}
										</div>
									</div>
								</TabsContent>
							)}
							{permissions?.logs.read && (
								<TabsContent value="logs">
									<div className="flex flex-col gap-4 pt-2.5">
										<ShowDockerLogs
											serverId={data?.serverId || ""}
											appName={data?.appName || ""}
											serviceId={data?.postgresId}
										/>
									</div>
								</TabsContent>
							)}
							<TabsContent value="backups">
								<div className="flex flex-col gap-4 pt-2.5">
									<ShowBackups
										id={postgresId}
										databaseType="postgres"
										backupType="database"
									/>
								</div>
							</TabsContent>
							{permissions?.service.create && (
								<TabsContent value="advanced">
									<div className="flex flex-col gap-4 pt-2.5">
										<ShowDatabaseAdvancedSettings
											id={postgresId}
											type="postgres"
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

export default Postgresql;
Postgresql.getLayout = (page: ReactElement) => {
	return <DashboardLayout>{page}</DashboardLayout>;
};

export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{
		postgresId: string;
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

	if (typeof params?.postgresId === "string") {
		try {
			await helpers.postgres.one.fetch({
				postgresId: params?.postgresId,
			});
			await helpers.settings.isCloud.prefetch();

			return {
				props: {
					trpcState: helpers.dehydrate(),
					postgresId: params?.postgresId,
					activeTab: (activeTab || "general") as TabState,
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
