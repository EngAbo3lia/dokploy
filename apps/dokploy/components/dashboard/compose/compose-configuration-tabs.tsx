import { useEffect, useState } from "react";import { ShowImport } from "@/components/dashboard/application/advanced/import/show-import";
import { ShowVolumes } from "@/components/dashboard/application/advanced/volumes/show-volumes";
import { ShowDomains } from "@/components/dashboard/application/domains/show-domains";
import { ShowEnvironment } from "@/components/dashboard/application/environment/show-environment";
import { ShowPatches } from "@/components/dashboard/application/patches/show-patches";
import { ShowSchedules } from "@/components/dashboard/application/schedules/show-schedules";
import { ShowVolumeBackups } from "@/components/dashboard/application/volume-backups/show-volume-backups";
import { AddCommandCompose } from "@/components/dashboard/compose/advanced/add-command";
import { IsolatedDeploymentTab } from "@/components/dashboard/compose/advanced/add-isolation";
import { ShowComposeContainers } from "@/components/dashboard/compose/containers/show-compose-containers";
import { ShowGeneralCompose } from "@/components/dashboard/compose/general/show";
import { ShowBackups } from "@/components/dashboard/database/backups/show-backups";
import { ComposeFreeMonitoring } from "@/components/dashboard/monitoring/free/container/show-free-compose-monitoring";
import { ComposePaidMonitoring } from "@/components/dashboard/monitoring/paid/container/show-paid-compose-monitoring";
import { AssignComposeNetworks } from "@/components/dashboard/networks/assign-compose-networks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/utils/api";

type ServerConfig = {
	ipAddress?: string;
	metricsConfig?: {
		server?: {
			port?: number;
			token?: string;
		};
	};
};

type Props = {
	composeId: string;
	sourceType: string;
	composeType: "docker-compose" | "stack";
	appName: string;
	serverId: string;
	server?: ServerConfig | null;
	refreshToken: string;
};

type SubTab =
	| "general"
	| "environment"
	| "domains"
	| "containers"
	| "backups"
	| "schedules"
	| "volumeBackups"
	| "patches"
	| "monitoring"
	| "advanced";

export const ComposeConfigurationTabs = ({
	composeId,
	sourceType,
	composeType,
	appName,
	serverId,
	server,
	refreshToken,
}: Props) => {
	const { data: permissions } = api.user.getPermissions.useQuery();
	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: monitoring } = api.user.getMetricsToken.useQuery();
	const [tab, setTab] = useState<SubTab>("general");

	useEffect(() => {
		if (typeof window === "undefined") return;
		const queryTab = new URLSearchParams(window.location.search).get(
			"configTab",
		);
		if (queryTab) {
			setTab(queryTab as SubTab);
		}
	}, []);

	const subTabs: { value: SubTab; label: string; show: boolean }[] = [
		{ value: "general", label: "General", show: true },
		{ value: "environment", label: "Environment", show: !!permissions?.envVars?.read },
		{ value: "domains", label: "Domains", show: !!permissions?.domain?.read },
		{ value: "containers", label: "Containers", show: !!permissions?.service?.read },
		{ value: "backups", label: "Backups", show: !!permissions?.service?.create },
		{ value: "schedules", label: "Schedules", show: !!permissions?.schedule?.read },
		{ value: "volumeBackups", label: "Volume Backups", show: !!permissions?.volumeBackup?.read },
		{ value: "patches", label: "Patches", show: sourceType !== "raw" },
		{
			value: "monitoring",
			label: "Monitoring",
			show:
				!!permissions?.monitoring?.read &&
				Boolean((serverId && isCloud) || !server),
		},
		{ value: "advanced", label: "Advanced", show: !!permissions?.service?.create },
	];

	const visibleSubTabs = subTabs.filter((item) => item.show);

	return (
		<Tabs
			value={tab}
			onValueChange={(value) => setTab(value as SubTab)}
			className="w-full"
		>
			<TabsList className="flex flex-wrap gap-2">
				{visibleSubTabs.map((item) => (
					<TabsTrigger key={item.value} value={item.value}>
						{item.label}
					</TabsTrigger>
				))}
			</TabsList>

			<TabsContent value="general">
				<div className="flex flex-col gap-4 pt-2.5">
					<ShowGeneralCompose composeId={composeId} />
				</div>
			</TabsContent>
			{permissions?.envVars?.read && (
				<TabsContent value="environment">
					<div className="flex flex-col gap-4 pt-2.5">
						<ShowEnvironment id={composeId} type="compose" />
					</div>
				</TabsContent>
			)}
			{permissions?.domain?.read && (
				<TabsContent value="domains">
					<div className="flex flex-col gap-4 pt-2.5">
						<ShowDomains id={composeId} type="compose" />
					</div>
				</TabsContent>
			)}
			{permissions?.service?.read && (
				<TabsContent value="containers">
					<div className="flex flex-col gap-4 pt-2.5">
						<ShowComposeContainers
							serverId={serverId || undefined}
							appName={appName}
							appType={composeType || "docker-compose"}
							serviceId={composeId}
						/>
					</div>
				</TabsContent>
			)}
			{permissions?.service?.create && (
				<TabsContent value="backups">
					<div className="flex flex-col gap-4 pt-2.5">
						<ShowBackups id={composeId} backupType="compose" />
					</div>
				</TabsContent>
			)}
			{permissions?.schedule?.read && (
				<TabsContent value="schedules">
					<div className="flex flex-col gap-4 pt-2.5">
						<ShowSchedules id={composeId} scheduleType="compose" />
					</div>
				</TabsContent>
			)}
			{permissions?.volumeBackup?.read && (
				<TabsContent value="volumeBackups">
					<div className="flex flex-col gap-4 pt-2.5">
						<ShowVolumeBackups
							id={composeId}
							type="compose"
							serverId={serverId || ""}
						/>
					</div>
				</TabsContent>
			)}
			{sourceType !== "raw" && (
				<TabsContent value="patches" className="w-full">
					<div className="flex flex-col gap-4 pt-2.5">
						<ShowPatches id={composeId} type="compose" />
					</div>
				</TabsContent>
			)}
			{permissions?.monitoring?.read && (
				<TabsContent value="monitoring">
					<div className="pt-2.5">
						<div className="flex flex-col border rounded-lg">
							{serverId && isCloud ? (
								<ComposePaidMonitoring
									serverId={serverId || ""}
									baseUrl={`http://${server?.ipAddress}:${server?.metricsConfig?.server?.port}`}
									appName={appName}
									token={server?.metricsConfig?.server?.token || ""}
									appType={composeType || "docker-compose"}
								/>
							) : (
								<ComposeFreeMonitoring
									serverId={serverId || ""}
									appName={appName}
									appType={composeType || "docker-compose"}
								/>
							)}
						</div>
					</div>
				</TabsContent>
			)}
			{permissions?.service?.create && (
				<TabsContent value="advanced">
					<div className="flex flex-col gap-4 pt-2.5">
						<AddCommandCompose composeId={composeId} />
						<ShowVolumes id={composeId} type="compose" />
						<ShowImport composeId={composeId} />
						<AssignComposeNetworks composeId={composeId} />
						<IsolatedDeploymentTab composeId={composeId} />
					</div>
				</TabsContent>
			)}
		</Tabs>
	);
};
