import type { HealthServiceRow } from "@dokploy/server";
import {
	Loader2,
	Radio,
	ScrollText,
	Search,
	Square,
	Terminal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
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
import { api } from "@/utils/api";

type ContainerItem = {
	containerId: string;
	name: string;
	state: string;
	status: string;
};

type Props = {
	projectId: string;
	environmentId: string;
	services: HealthServiceRow[];
};

export const ProjectLogs = ({ services }: Props) => {
	const utils = api.useUtils();
	const composeServices = useMemo(
		() => services.filter((s) => s.type === "compose"),
		[services],
	);
	const [serviceId, setServiceId] = useState<string>("");
	const [containerId, setContainerId] = useState<string>("");
	const [containers, setContainers] = useState<ContainerItem[]>([]);
	const [containersLoading, setContainersLoading] = useState(false);
	const [logs, setLogs] = useState<string[]>([]);
	const [logsLoading, setLogsLoading] = useState(false);
	const [live, setLive] = useState(true);
	const [search, setSearch] = useState("");
	const [error, setError] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	const selectedService = composeServices.find(
		(s) => s.serviceId === serviceId,
	);

	const loadContainers = useCallback(async () => {
		if (!selectedService?.appName) return;
		setContainersLoading(true);
		setContainerId("");
		try {
			const all = (await utils.docker.getContainers.fetch(
				{},
			)) as unknown as ContainerItem[];
			const prefix = selectedService.appName.toLowerCase();
			const matched = (all || []).filter((c) =>
				c.name.toLowerCase().startsWith(prefix),
			);
			setContainers(matched);
		} catch {
			setContainers([]);
		} finally {
			setContainersLoading(false);
		}
	}, [selectedService, utils]);

	useEffect(() => {
		if (serviceId) {
			loadContainers();
		}
	}, [serviceId, loadContainers]);

	const loadLogs = useCallback(async () => {
		if (!serviceId || !containerId) return;
		setLogsLoading(true);
		try {
			const data = (await utils.compose.readLogs.fetch({
				composeId: serviceId,
				containerId,
				tail: 500,
				since: "all",
			})) as unknown as string[];
			setLogs(Array.isArray(data) ? data : []);
			setError(null);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message.slice(0, 200)
					: "Failed to read logs",
			);
		} finally {
			setLogsLoading(false);
		}
	}, [serviceId, containerId, utils]);

	useEffect(() => {
		if (!live || !serviceId || !containerId) return;
		loadLogs();
		const interval = setInterval(loadLogs, 5000);
		return () => clearInterval(interval);
	}, [live, serviceId, containerId, loadLogs]);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [logs]);

	const filteredLogs = useMemo(() => {
		if (!search) return logs;
		const needle = search.toLowerCase();
		return logs.filter((line) => line.toLowerCase().includes(needle));
	}, [logs, search]);

	if (composeServices.length === 0) {
		return (
			<Card>
				<CardContent className="flex h-40 flex-col items-center justify-center gap-2">
					<ScrollText className="size-8 text-muted-foreground" />
					<span className="text-sm font-medium">
						No compose services in this environment
					</span>
					<span className="text-xs text-muted-foreground">
						Logs are only available for compose services
					</span>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex flex-row items-center gap-2 text-base">
					<ScrollText className="size-4 text-muted-foreground" />
					Logs
				</CardTitle>
				<CardDescription>
					Read runtime logs of any container in this environment
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<Select
						value={serviceId}
						onValueChange={(value) => setServiceId(value)}
					>
						<SelectTrigger className="w-[220px]">
							<SelectValue placeholder="Service" />
						</SelectTrigger>
						<SelectContent>
							{composeServices.map((service) => (
								<SelectItem key={service.serviceId} value={service.serviceId}>
									{service.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={containerId}
						onValueChange={(value) => setContainerId(value)}
						disabled={!serviceId || containersLoading}
					>
						<SelectTrigger className="w-[260px]">
							<SelectValue
								placeholder={
									containersLoading ? "Loading containers..." : "Container"
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{containers.map((container) => (
								<SelectItem
									key={container.containerId}
									value={container.containerId}
								>
									{container.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						variant={live ? "default" : "outline"}
						size="sm"
						onClick={() => setLive((prev) => !prev)}
						disabled={!serviceId || !containerId}
					>
						{live ? (
							<Square className="size-3.5" />
						) : (
							<Radio className="size-3.5" />
						)}
						{live ? "Stop live" : "Live"}
					</Button>
					<Input
						className="w-[220px]"
						placeholder="Search logs..."
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</div>

				{error && (
					<div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
						<span className="truncate">{error}</span>
						<Button variant="outline" size="sm" onClick={loadLogs}>
							Retry
						</Button>
					</div>
				)}

				<div
					ref={scrollRef}
					className="min-h-[300px] max-h-[500px] overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-relaxed"
				>
					{!serviceId ? (
						<p className="py-10 text-center text-muted-foreground">
							Select a service first
						</p>
					) : !containerId ? (
						<p className="py-10 text-center text-muted-foreground">
							Select a container to view its logs
						</p>
					) : logsLoading && filteredLogs.length === 0 ? (
						<div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
							<Loader2 className="size-4 animate-spin" />
							Reading logs...
						</div>
					) : filteredLogs.length === 0 ? (
						<EmptyState
							icon={
								search ? (
									<Search className="size-8 text-muted-foreground/60" />
								) : (
									<Terminal className="size-8 text-muted-foreground/60" />
								)
							}
							title={search ? "No matching log lines" : "No logs available"}
							description={
								search
									? "Try adjusting your search query."
									: "Logs will appear here once the container produces output."
							}
							className="py-6"
						/>
					) : (
						filteredLogs.map((line, index) => (
							<div
								key={index}
								className="border-b border-border/40 py-0.5 text-foreground/80 last:border-b-0"
							>
								{line}
							</div>
						))
					)}
				</div>
			</CardContent>
		</Card>
	);
};
