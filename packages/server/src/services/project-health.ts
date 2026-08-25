import { db } from "@dokploy/server/db";
import { eq, inArray } from "drizzle-orm";
import {
	applications,
	compose,
	libsql,
	mariadb,
	mongo,
	mysql,
	postgres,
	projects,
	redis,
} from "@dokploy/server/db/schema";
import { getContainers } from "./docker";

export type RuntimeState =
	| "healthy"
	| "degraded"
	| "failed"
	| "unknown";

export type ProjectHealthStatus =
	| "healthy"
	| "degraded"
	| "deploying"
	| "failed"
	| "stopped"
	| "empty"
	| "unknown";

export type HealthContainers = {
	total: number;
	running: number;
	healthy: number;
};

export type HealthDeployment = {
	title: string;
	status: string | null;
	createdAt: string | null;
	finishedAt: string | null;
	startedAt: string | null;
};

export type HealthDomain = {
	host: string;
	enabled: boolean;
	https: boolean;
};

export type HealthServiceRow = {
	serviceId: string;
	type: string;
	name: string;
	description: string | null;
	appName: string | null;
	icon: string | null;
	serverId: string | null;
	serverName: string | null;
	status: string | null;
	runtime: RuntimeState;
	isDeploying: boolean;
	containers: HealthContainers;
	lastDeployment: HealthDeployment | null;
	domains: HealthDomain[];
	git: { owner: string | null; repository: string | null; branch: string | null } | null;
	environmentId: string;
};

export type HealthEnvironmentRow = {
	environmentId: string;
	name: string;
	description: string | null;
	isDefault: boolean;
	status: ProjectHealthStatus;
	services: HealthServiceRow[];
	containers: HealthContainers;
};

export type ProjectHealth = {
	projectId: string;
	name: string;
	description: string | null;
	status: ProjectHealthStatus;
	environments: HealthEnvironmentRow[];
	totals: {
		services: number;
		running: number;
		failed: number;
		deploying: number;
		containers: HealthContainers;
		domains: number;
		enabledDomains: number;
		lastDeployAt: string | null;
	};
};

type Containers = Awaited<ReturnType<typeof getContainers>>;

type RawServiceItem = {
	serviceId: string;
	type: string;
	name: string;
	description: string | null;
	appName: string | null;
	icon: string | null;
	serverId: string | null;
	serverName: string | null;
	status: string | null;
	composeType?: string | null;
	deployments?: HealthDeployment[];
	domains?: HealthDomain[];
	git?: { owner: string | null; repository: string | null; branch: string | null } | null;
	environmentId: string;
};

const matchesAppName = (name: string, appName: string): boolean => {
	const lowerName = name.toLowerCase();
	const lowerAppName = appName.toLowerCase();
	return lowerName === lowerAppName || lowerName.startsWith(`${lowerAppName}-`);
};

const containerCount = (
	containers: Containers,
	appName: string | null,
	filter: (c: NonNullable<Containers>[number]) => boolean,
): number => {
	if (!appName || !containers) return 0;
	return containers.filter(
		(c) => matchesAppName(c.name, appName) && filter(c),
	).length;
};

const deriveRuntime = (
	appName: string | null,
	composeType: string | null | undefined,
	containers: Containers,
): RuntimeState => {
	if (composeType === "stack" || !appName || !containers) {
		return "unknown";
	}
	const serviceContainers = containers.filter((c) =>
		matchesAppName(c.name, appName),
	);
	if (serviceContainers.length === 0) return "unknown";

	if (serviceContainers.some((c) => c.status.includes("(unhealthy)"))) {
		return "degraded";
	}
	if (serviceContainers.some((c) => c.state === "restarting")) {
		return "degraded";
	}
	if (serviceContainers.some((c) => c.state === "running")) {
		return "healthy";
	}
	return "failed";
};

const deployTimestamp = (deployment: HealthDeployment | null): string | null => {
	if (!deployment) return null;
	return (
		deployment.finishedAt ||
		deployment.startedAt ||
		deployment.createdAt ||
		null
	);
};

const pickLatest = (
	deployments: HealthDeployment[],
): HealthDeployment | null => {
	return deployments.reduce<HealthDeployment | null>((best, current) => {
		if (!best) return current;
		const bestDate = deployTimestamp(best) || "";
		const currentDate = deployTimestamp(current) || "";
		return currentDate > bestDate ? current : best;
	}, null);
};

const serviceStatus = (
	runtime: RuntimeState,
	isDeploying: boolean,
): ProjectHealthStatus => {
	if (isDeploying) return "deploying";
	if (runtime === "degraded") return "degraded";
	if (runtime === "failed") return "failed";
	if (runtime === "healthy") return "healthy";
	return "stopped";
};

const aggregateStatus = (
	statuses: ProjectHealthStatus[],
): ProjectHealthStatus => {
	if (statuses.includes("failed")) return "failed";
	if (statuses.includes("degraded")) return "degraded";
	if (statuses.includes("deploying")) return "deploying";
	if (statuses.includes("healthy")) return "healthy";
	if (statuses.length > 0) return "stopped";
	return "empty";
};

const buildServiceRow = (
	item: RawServiceItem,
	containersPerServer: Map<string | null, Containers>,
): HealthServiceRow => {
	const containers = containersPerServer.get(item.serverId) || [];
	const runtime = deriveRuntime(item.appName, item.composeType, containers);
	const isDeploying = ["running", "queued"].includes(item.status || "");
	return {
		serviceId: item.serviceId,
		type: item.type,
		name: item.name,
		description: item.description,
		appName: item.appName,
		icon: item.icon,
		serverId: item.serverId,
		serverName: item.serverName,
		status: item.status,
		runtime,
		isDeploying,
		containers: {
			total: containerCount(
				containers,
				item.appName,
				() => true,
			),
			running: containerCount(
				containers,
				item.appName,
				(c) => c.state === "running",
			),
			healthy: containerCount(
				containers,
				item.appName,
				(c) => c.status.includes("(healthy)"),
			),
		},
		lastDeployment: pickLatest(item.deployments || []),
		domains: item.domains || [],
		git: item.git || null,
		environmentId: item.environmentId,
	};
};

const fetchContainersPerServer = async (
	serverIds: Set<string | null>,
): Promise<Map<string | null, Containers>> => {
	const map = new Map<string | null, Containers>();
	const results = await Promise.allSettled(
		[...serverIds].map(async (serverId) => ({
			serverId,
			containers: await getContainers(serverId),
		})),
	);
	for (const result of results) {
		if (result.status === "fulfilled") {
			map.set(result.value.serverId, result.value.containers || []);
		}
	}
	return map;
};

const emptyDeploymentSummary = [] as HealthDeployment[];
const emptyDomainSummary = [] as HealthDomain[];

const prepareServiceList = async (
	envIds: string[],
): Promise<RawServiceItem[]> => {
	if (envIds.length === 0) return [];

	const [comp, apps, pgs, mys, mar, mng, rds, lsq] = await Promise.all([
		db.query.compose.findMany({
			where: inArray(compose.environmentId, envIds),
			columns: {
				composeId: true,
				name: true,
				description: true,
				appName: true,
				icon: true,
				serverId: true,
				environmentId: true,
				composeStatus: true,
				composeType: true,
				owner: true,
				repository: true,
				branch: true,
			},
			with: {
				server: { columns: { name: true } },
				domains: {
					columns: { host: true, enabled: true, https: true },
				},
				deployments: {
					columns: {
						title: true,
						status: true,
						createdAt: true,
						finishedAt: true,
						startedAt: true,
					},
				},
			},
		}),
		db.query.applications.findMany({
			where: inArray(applications.environmentId, envIds),
			with: {
				server: { columns: { name: true } },
				deployments: {
					columns: {
						title: true,
						status: true,
						createdAt: true,
						finishedAt: true,
						startedAt: true,
					},
				},
			},
		}),
		db.query.postgres.findMany({
			where: inArray(postgres.environmentId, envIds),
			with: { server: { columns: { name: true } } },
		}),
		db.query.mysql.findMany({
			where: inArray(mysql.environmentId, envIds),
			with: { server: { columns: { name: true } } },
		}),
		db.query.mariadb.findMany({
			where: inArray(mariadb.environmentId, envIds),
			with: { server: { columns: { name: true } } },
		}),
		db.query.mongo.findMany({
			where: inArray(mongo.environmentId, envIds),
			with: { server: { columns: { name: true } } },
		}),
		db.query.redis.findMany({
			where: inArray(redis.environmentId, envIds),
			with: { server: { columns: { name: true } } },
		}),
		db.query.libsql.findMany({
			where: inArray(libsql.environmentId, envIds),
			with: { server: { columns: { name: true } } },
		}),
	]);

	const items: RawServiceItem[] = [];

	for (const row of comp) {
		items.push({
			serviceId: row.composeId,
			type: "compose",
			name: row.name,
			description: row.description,
			appName: row.appName,
			icon: row.icon,
			serverId: row.serverId,
			serverName: row.server?.name || null,
			status: row.composeStatus,
			composeType: row.composeType,
			deployments: row.deployments || emptyDeploymentSummary,
			domains: row.domains || emptyDomainSummary,
			git: {
				owner: row.owner,
				repository: row.repository,
				branch: row.branch,
			},
			environmentId: row.environmentId,
		});
	}
	for (const row of apps) {
		items.push({
			serviceId: row.applicationId,
			type: "application",
			name: row.name,
			description: row.description,
			appName: row.appName,
			icon: row.icon,
			serverId: row.serverId,
			serverName: row.server?.name || null,
			status: row.applicationStatus,
			deployments: row.deployments || emptyDeploymentSummary,
			environmentId: row.environmentId,
		});
	}
	for (const row of pgs) {
		items.push({
			serviceId: row.postgresId,
			type: "postgres",
			name: row.name,
			description: row.description,
			appName: row.appName,
			icon: null,
			serverId: row.serverId,
			serverName: row.server?.name || null,
			status: row.applicationStatus,
			environmentId: row.environmentId,
		});
	}
	for (const row of mys) {
		items.push({
			serviceId: row.mysqlId,
			type: "mysql",
			name: row.name,
			description: row.description,
			appName: row.appName,
			icon: null,
			serverId: row.serverId,
			serverName: row.server?.name || null,
			status: row.applicationStatus,
			environmentId: row.environmentId,
		});
	}
	for (const row of mar) {
		items.push({
			serviceId: row.mariadbId,
			type: "mariadb",
			name: row.name,
			description: row.description,
			appName: row.appName,
			icon: null,
			serverId: row.serverId,
			serverName: row.server?.name || null,
			status: row.applicationStatus,
			environmentId: row.environmentId,
		});
	}
	for (const row of mng) {
		items.push({
			serviceId: row.mongoId,
			type: "mongo",
			name: row.name,
			description: row.description,
			appName: row.appName,
			icon: null,
			serverId: row.serverId,
			serverName: row.server?.name || null,
			status: row.applicationStatus,
			environmentId: row.environmentId,
		});
	}
	for (const row of rds) {
		items.push({
			serviceId: row.redisId,
			type: "redis",
			name: row.name,
			description: row.description,
			appName: row.appName,
			icon: null,
			serverId: row.serverId,
			serverName: row.server?.name || null,
			status: row.applicationStatus,
			environmentId: row.environmentId,
		});
	}
	for (const row of lsq) {
		items.push({
			serviceId: row.libsqlId,
			type: "libsql",
			name: row.name,
			description: row.description,
			appName: row.appName,
			icon: null,
			serverId: row.serverId,
			serverName: row.server?.name || null,
			status: row.applicationStatus,
			environmentId: row.environmentId,
		});
	}

	return items;
};

const summarizeContainers = (
	services: HealthServiceRow[],
): HealthContainers => {
	return services.reduce<HealthContainers>(
		(acc, service) => ({
			total: acc.total + service.containers.total,
			running: acc.running + service.containers.running,
			healthy: acc.healthy + service.containers.healthy,
		}),
		{ total: 0, running: 0, healthy: 0 },
	);
};

const assembleProjectHealth = async (project: {
	projectId: string;
	name: string;
	description: string | null;
	environments: {
		environmentId: string;
		name: string;
		description: string | null;
		isDefault: boolean;
	}[];
}): Promise<ProjectHealth> => {
	const items = await prepareServiceList(
		project.environments.map((env) => env.environmentId),
	);

	const serverIds = new Set<string | null>();
	for (const item of items) {
		serverIds.add(item.serverId);
	}
	const containersPerServer = await fetchContainersPerServer(serverIds);

	const rows = items
		.map((item) => buildServiceRow(item, containersPerServer))
		.filter(
			(row) =>
				project.environments.some(
					(env) => env.environmentId === row.environmentId,
				),
		);

	const envRows: HealthEnvironmentRow[] = project.environments.map((env) => {
		const services = rows.filter(
			(row) => row.environmentId === env.environmentId,
		);
		const status = aggregateStatus(
			services.map((s) => serviceStatus(s.runtime, s.isDeploying)),
		);
		return {
			environmentId: env.environmentId,
			name: env.name,
			description: env.description,
			isDefault: env.isDefault,
			status,
			services,
			containers: summarizeContainers(services),
		};
	});

	const allServices = envRows.flatMap((env) => env.services);
	const status = aggregateStatus(
		allServices.map((s) => serviceStatus(s.runtime, s.isDeploying)),
	);
	const deployDates = allServices
		.map((s) => deployTimestamp(s.lastDeployment))
		.filter((d): d is string => !!d)
		.sort();
	const domains = allServices.flatMap((s) => s.domains);

	return {
		projectId: project.projectId,
		name: project.name,
		description: project.description,
		status,
		environments: envRows,
		totals: {
			services: allServices.length,
			running: allServices.filter((s) => s.runtime === "healthy").length,
			failed: allServices.filter((s) => s.runtime === "failed").length,
			deploying: allServices.filter((s) => s.isDeploying).length,
			containers: summarizeContainers(allServices),
			domains: domains.length,
			enabledDomains: domains.filter((d) => d.enabled).length,
			lastDeployAt: deployDates[deployDates.length - 1] || null,
		},
	};
};

export const getProjectHealth = async (
	projectId: string,
): Promise<ProjectHealth | null> => {
	const project = await db.query.projects.findFirst({
		where: eq(projects.projectId, projectId),
		with: {
			environments: true,
		},
	});
	if (!project) return null;
	return assembleProjectHealth(project);
};

export const getAllProjectsHealth = async (
	organizationId: string,
): Promise<ProjectHealth[]> => {
	const projectRows = await db.query.projects.findMany({
		where: eq(projects.organizationId, organizationId),
		with: {
			environments: true,
		},
	});
	return Promise.all(projectRows.map((p) => assembleProjectHealth(p)));
};
