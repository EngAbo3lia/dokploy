import { useEffect, useState, type ReactNode } from "react";
import { ShowImport } from "@/components/dashboard/application/advanced/import/show-import";
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
import { ServiceTabsList } from "@/components/dashboard/service/service-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
		{
			value: "environment",
			label: "Environment",
			show: !!permissions?.envVars?.read,
		},
		{ value: "domains", label: "Domains", show: !!permissions?.domain?.read },
		{
			value: "containers",
			label: "Containers",
			show: !!permissions?.service?.read,
		},
		{
			value: "backups",
			label: "Backups",
			show: !!permissions?.service?.create,
		},
		{
			value: "schedules",
			label: "Schedules",
			show: !!permissions?.schedule?.read,
		},
		{
			value: "volumeBackups",
			label: "Volume Backups",
			show: !!permissions?.volumeBackup?.read,
		},
		{ value: "patches", label: "Patches", show: sourceType !== "raw" },
		{
			value: "monitoring",
			label: "Monitoring",
			show:
				!!permissions?.monitoring?.read &&
				Boolean((serverId && isCloud) || !server),
		},
		{
			value: "advanced",
			label: "Advanced",
			show: !!permissions?.service?.create,
		},
	];

	const visibleSubTabs = subTabs.filter((item) => item.show);

	const content: Record<SubTab, ReactNode> = {
		general: (
			<div className="flex flex-col gap-4 pt-2.5">
				<ShowGeneralCompose composeId={composeId} />
			</div>
		),
		environment: (
			<div className="flex flex-col gap-4 pt-2.5">
				<ShowEnvironment id={composeId} type="compose" />
			</div>
		),
		domains: (
			<div className="flex flex-col gap-4 pt-2.5">
				<ShowDomains id={composeId} type="compose" />
			</div>
		),
		containers: (
			<div className="flex flex-col gap-4 pt-2.5">
				<ShowComposeContainers
					serverId={serverId || undefined}
					appName={appName}
					appType={composeType || "docker-compose"}
					serviceId={composeId}
				/>
			</div>
		),
		backups: (
			<div className="flex flex-col gap-4 pt-2.5">
				<ShowBackups id={composeId} backupType="compose" />
			</div>
		),
		schedules: (
			<div className="flex flex-col gap-4 pt-2.5">
				<ShowSchedules id={composeId} scheduleType="compose" />
			</div>
		),
		volumeBackups: (
			<div className="flex flex-col gap-4 pt-2.5">
				<ShowVolumeBackups
					id={composeId}
					type="compose"
					serverId={serverId || ""}
				/>
			</div>
		),
		patches: (
			<div className="flex flex-col gap-4 pt-2.5">
				<ShowPatches id={composeId} type="compose" />
			</div>
		),
		monitoring: (
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
		),
		advanced: (
			<div className="flex flex-col gap-4 pt-2.5">
				<AddCommandCompose composeId={composeId} />
				<ShowVolumes id={composeId} type="compose" />
				<ShowImport composeId={composeId} />
				<AssignComposeNetworks composeId={composeId} />
				<IsolatedDeploymentTab composeId={composeId} />
			</div>
		),
	};

	return (
		<Tabs
			value={tab}
			onValueChange={(value) => setTab(value as SubTab)}
			className="w-full"
		>
			<ServiceTabsList
				tabs={visibleSubTabs.map((item) => ({
					value: item.value,
					label: item.label,
				}))}
			/>

			{visibleSubTabs.map((item) => (
				<TabsContent
					key={item.value}
					value={item.value}
					className={item.value === "monitoring" ? undefined : "w-full"}
				>
					{content[item.value]}
				</TabsContent>
			))}
		</Tabs>
	);
};
