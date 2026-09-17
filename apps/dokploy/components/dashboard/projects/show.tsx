import {
	AlertTriangle,
	ArrowUpDown,
	BookIcon,
	FolderInput,
	Loader2,
	MoreHorizontalIcon,
	Search,
	TrashIcon,
} from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BreadcrumbSidebar } from "@/components/shared/breadcrumb-sidebar";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { FocusShortcutInput } from "@/components/shared/focus-shortcut-input";
import { TagBadge } from "@/components/shared/tag-badge";
import { TagFilter } from "@/components/shared/tag-filter";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/creative-os/page-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/utils/api";
import { useDebounce } from "@/utils/hooks/use-debounce";
import { STATUS_META } from "../project/health-status";
import { HandleProject } from "./handle-project";
import { ProjectEnvironment } from "./project-environment";

export const ShowProjects = () => {
	const utils = api.useUtils();
	const router = useRouter();
	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data, isPending } = api.project.all.useQuery();
	const { data: auth } = api.user.get.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const { mutateAsync } = api.project.remove.useMutation();
	const { data: availableTags } = api.tag.all.useQuery();
	const { data: projectsHealth } = api.project.healthAll.useQuery(undefined, {
		refetchInterval: 60000,
	});
	const healthByProjectId = useMemo(
		() =>
			new Map(
				(projectsHealth || []).map((projectHealth) => [
					projectHealth.projectId,
					projectHealth,
				]),
			),
		[projectsHealth],
	);

	const [searchQuery, setSearchQuery] = useState(
		router.isReady && typeof router.query.q === "string" ? router.query.q : "",
	);
	const debouncedSearchQuery = useDebounce(searchQuery, 500);

	const [sortBy, setSortBy] = useState<string>(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem("projectsSort") || "createdAt-desc";
		}
		return "createdAt-desc";
	});

	const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("projectsTagFilter");
			return saved ? JSON.parse(saved) : [];
		}
		return [];
	});

	useEffect(() => {
		localStorage.setItem("projectsSort", sortBy);
	}, [sortBy]);

	useEffect(() => {
		localStorage.setItem("projectsTagFilter", JSON.stringify(selectedTagIds));
	}, [selectedTagIds]);

	useEffect(() => {
		if (!availableTags) return;
		const validIds = new Set(availableTags.map((t) => t.tagId));
		setSelectedTagIds((prev) => {
			const filtered = prev.filter((id) => validIds.has(id));
			return filtered.length === prev.length ? prev : filtered;
		});
	}, [availableTags]);

	useEffect(() => {
		if (!router.isReady) return;
		const urlQuery = typeof router.query.q === "string" ? router.query.q : "";
		if (urlQuery !== searchQuery) {
			setSearchQuery(urlQuery);
		}
	}, [router.isReady, router.query.q]);

	useEffect(() => {
		if (!router.isReady) return;
		const urlQuery = typeof router.query.q === "string" ? router.query.q : "";
		if (debouncedSearchQuery === urlQuery) return;

		const newQuery = { ...router.query };
		if (debouncedSearchQuery) {
			newQuery.q = debouncedSearchQuery;
		} else {
			delete newQuery.q;
		}
		router.replace({ pathname: router.pathname, query: newQuery }, undefined, {
			shallow: true,
		});
	}, [debouncedSearchQuery]);

	const filteredProjects = useMemo(() => {
		if (!data) return [];

		let filtered = data.filter(
			(project) =>
				project.name
					.toLowerCase()
					.includes(debouncedSearchQuery.toLowerCase()) ||
				project.description
					?.toLowerCase()
					.includes(debouncedSearchQuery.toLowerCase()),
		);

		// Filter by selected tags (OR logic: show projects with ANY selected tag)
		if (selectedTagIds.length > 0) {
			filtered = filtered.filter((project) =>
				project.projectTags?.some((pt) =>
					selectedTagIds.includes(pt.tag.tagId),
				),
			);
		}

		// Then sort the filtered results
		const [field, direction] = sortBy.split("-");
		return [...filtered].sort((a, b) => {
			let comparison = 0;
			switch (field) {
				case "name":
					comparison = a.name.localeCompare(b.name);
					break;
				case "createdAt":
					comparison =
						new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
					break;
				case "services": {
					const aTotalServices = a.environments.reduce((total, env) => {
						return (
							total +
							(env.applications?.length || 0) +
							(env.libsql?.length || 0) +
							(env.mariadb?.length || 0) +
							(env.mongo?.length || 0) +
							(env.mysql?.length || 0) +
							(env.postgres?.length || 0) +
							(env.redis?.length || 0) +
							(env.compose?.length || 0)
						);
					}, 0);
					const bTotalServices = b.environments.reduce((total, env) => {
						return (
							total +
							(env.applications?.length || 0) +
							(env.libsql?.length || 0) +
							(env.mariadb?.length || 0) +
							(env.mongo?.length || 0) +
							(env.mysql?.length || 0) +
							(env.postgres?.length || 0) +
							(env.redis?.length || 0) +
							(env.compose?.length || 0)
						);
					}, 0);
					comparison = aTotalServices - bTotalServices;
					break;
				}
				default:
					comparison = 0;
			}
			return direction === "asc" ? comparison : -comparison;
		});
	}, [data, debouncedSearchQuery, sortBy, selectedTagIds]);

	return (
		<>
			<BreadcrumbSidebar
				list={[{ name: "Projects", href: "/dashboard/projects" }]}
			/>
			<div className="studio-page">
				<PageHeader
					title="Projects"
					description="Create and manage your projects"
				>
					{permissions?.project.create ? <HandleProject /> : null}
				</PageHeader>

				<div className="flex min-h-[60vh] flex-col gap-4">
							{isPending ? (
								<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[60vh]">
									<span>Loading...</span>
									<Loader2 className="animate-spin size-4" />
								</div>
							) : (
								<>
									<div className="flex max-sm:flex-col gap-4 items-center w-full">
										<div className="flex-1 relative max-sm:w-full">
											<FocusShortcutInput
												placeholder="Filter projects..."
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
												className="pr-10"
											/>

											<Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
										</div>
										<div className="flex items-center gap-2">
											<TagFilter
												tags={
													availableTags?.map((tag) => ({
														id: tag.tagId,
														name: tag.name,
														color: tag.color || undefined,
													})) || []
												}
												selectedTags={selectedTagIds}
												onTagsChange={setSelectedTagIds}
											/>
											<div className="flex items-center gap-2 min-w-48 max-sm:w-full">
												<ArrowUpDown className="size-4 text-muted-foreground" />
												<Select value={sortBy} onValueChange={setSortBy}>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Sort by..." />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="name-asc">Name (A-Z)</SelectItem>
														<SelectItem value="name-desc">
															Name (Z-A)
														</SelectItem>
														<SelectItem value="createdAt-desc">
															Newest first
														</SelectItem>
														<SelectItem value="createdAt-asc">
															Oldest first
														</SelectItem>
														<SelectItem value="services-desc">
															Most services
														</SelectItem>
														<SelectItem value="services-asc">
															Least services
														</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>
									</div>
									{filteredProjects?.length === 0 && (
										<div className="studio-empty mt-6 h-[50vh]">
											<div className="studio-empty-icon">
												<FolderInput className="size-8" />
											</div>
											<p className="studio-empty-title">No projects found</p>
											<p className="studio-empty-text">
												Create your first project to organize your services
												and deployments.
											</p>
										</div>
									)}
									<div className="w-full grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
										{filteredProjects?.map((project) => {
											const emptyServices = project?.environments
												.map(
													(env) =>
														env.applications.length === 0 &&
														env.compose.length === 0 &&
														env.libsql.length === 0 &&
														env.mariadb.length === 0 &&
														env.mongo.length === 0 &&
														env.mysql.length === 0 &&
														env.postgres.length === 0 &&
														env.redis.length === 0,
												)
												.every(Boolean);

											const totalServices = project?.environments
												.map(
													(env) =>
														env.applications.length +
														env.compose.length +
														env.libsql.length +
														env.mariadb.length +
														env.mongo.length +
														env.mysql.length +
														env.postgres.length +
														env.redis.length,
												)
												.reduce((acc, curr) => acc + curr, 0);

											// Find default environment from accessible environments, or fall back to first accessible environment
											const accessibleEnvironment =
												project?.environments.find((env) => env.isDefault) ||
												project?.environments?.[0];

											const hasNoEnvironments = !accessibleEnvironment;

											return (
												<div
													key={project.projectId}
													className="w-full lg:max-w-md"
												>
													<article
														className="studio-card studio-card-hover group relative flex h-full w-full cursor-pointer flex-col"
														onClick={() => {
															if (!hasNoEnvironments) {
																router.push(
																	`/dashboard/project/${project.projectId}/environment/${accessibleEnvironment?.environmentId}`,
																);
															}
														}}
													>
														<div className="studio-card-head flex-1">
															<div className="flex w-full items-start justify-between gap-2 overflow-clip">
																<span className="flex cursor-pointer flex-col gap-1.5">
																	<div className="flex items-center gap-2">
																		<BookIcon className="size-4 text-muted-foreground" />
																		<span className="text-base font-medium leading-none">
																			{project.name}
																		</span>
																	</div>

																	<span className="text-sm font-medium text-muted-foreground break-normal">
																		{project.description}
																	</span>

																	{project.projectTags &&
																		project.projectTags.length > 0 && (
																			<div className="flex flex-wrap gap-1.5 mt-2">
																				{project.projectTags.map((pt) => (
																					<TagBadge
																						key={pt.tag.tagId}
																						name={pt.tag.name}
																						color={pt.tag.color}
																					/>
																				))}
																			</div>
																		)}

																	{(() => {
																		const health = healthByProjectId.get(
																			project.projectId,
																		);
																		if (!health) return null;
																		const meta = STATUS_META[health.status];
																		return (
																			<div className="mt-2 flex flex-col gap-1.5">
																				<span
																					className={`studio-badge w-fit ${meta.badge}`}
																				>
																					<span className="relative flex size-1.5">
																						{meta.pulse && (
																							<span
																								className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${meta.dot}`}
																							/>
																						)}
																						<span
																							className={`relative inline-flex size-1.5 rounded-full ${meta.dot}`}
																						/>
																					</span>
																					{meta.label}
																				</span>
																				<span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono tabular-nums">
																					<span>
																						{health.totals.services} services
																					</span>
																					<span className="text-emerald-600 dark:text-emerald-400">
																						{health.totals.running} running
																					</span>
																					{health.totals.failed > 0 && (
																						<span className="text-red-600 dark:text-red-400">
																							{health.totals.failed} failed
																						</span>
																					)}
																					{health.totals.stopped > 0 && (
																						<span className="text-muted-foreground">
																							{health.totals.stopped} stopped
																						</span>
																					)}
																					{health.totals.deploying > 0 && (
																						<span className="text-blue-600 dark:text-blue-400">
																							{health.totals.deploying}{" "}
																							deploying
																						</span>
																					)}
																				</span>
																				{health.totals.lastDeployAt && (
																					<DateTooltip
																						date={health.totals.lastDeployAt}
																					>
																						<span className="text-muted-foreground">
																							Last deploy
																						</span>
																					</DateTooltip>
																				)}
																				{(() => {
																					const firstEnv =
																						health.environments[0];
																					if (
																						!firstEnv ||
																						firstEnv.services.length === 0
																					)
																						return null;
																					return (
																						<span className="flex flex-wrap gap-1">
																							{firstEnv.services
																								.slice(0, 8)
																								.map((service) => (
																									<span
																										key={service.serviceId}
																										title={service.name}
																										className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border bg-muted px-1 text-[10px] font-medium text-muted-foreground"
																									>
																										{service.name
																											.split(" ")
																											.slice(0, 2)
																											.map((word) => word[0])
																											.join("")
																											.toUpperCase()}
																									</span>
																								))}
																						</span>
																					);
																				})()}
																				<span className="text-xs text-muted-foreground">
																					{(() => {
																						const servers = [
																							...new Set(
																								health.environments.flatMap(
																									(env) =>
																										env.services
																											.map((s) => s.serverName)
																											.filter(
																												(
																													name,
																												): name is string =>
																													Boolean(name),
																											),
																								),
																							),
																						];
																						return servers.length > 0
																							? servers.join(" + ")
																							: "Dokploy Server (local)";
																					})()}
																				</span>
																			</div>
																		);
																	})()}
																	{hasNoEnvironments && (
																		<div className="flex flex-row gap-2 items-center rounded-lg bg-yellow-50 p-2 mt-2 dark:bg-yellow-950">
																			<AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
																			<span className="text-xs text-yellow-600 dark:text-yellow-400">
																				You have access to this project but no
																				environments are available
																			</span>
																		</div>
																	)}
																</span>
																<div
																	className="flex self-start space-x-1"
																	onClick={(e) => e.stopPropagation()}
																	onKeyDown={(e) => e.stopPropagation()}
																>
																	<DropdownMenu>
																		<DropdownMenuTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="px-2"
																			>
																				<MoreHorizontalIcon className="size-5" />
																			</Button>
																		</DropdownMenuTrigger>
																		<DropdownMenuContent className="w-[200px] space-y-2 overflow-y-auto max-h-[280px]">
																			<DropdownMenuLabel className="font-normal">
																				Actions
																			</DropdownMenuLabel>
																			<div>
																				<ProjectEnvironment
																					projectId={project.projectId}
																				/>
																			</div>
																			<div>
																				<HandleProject
																					projectId={project.projectId}
																				/>
																			</div>
																			<div>
																				{permissions?.project.delete && (
																					<AlertDialog>
																						<AlertDialogTrigger className="w-full">
																							<DropdownMenuItem
																								className="w-full cursor-pointer space-x-3"
																								onSelect={(e) =>
																									e.preventDefault()
																								}
																							>
																								<TrashIcon className="size-4" />
																								<span>Delete</span>
																							</DropdownMenuItem>
																						</AlertDialogTrigger>
																						<AlertDialogContent>
																							<AlertDialogHeader>
																								<AlertDialogTitle>
																									Are you sure to delete this
																									project?
																								</AlertDialogTitle>
																								{!emptyServices ? (
																									<div className="flex flex-row gap-4 rounded-lg bg-yellow-50 p-2 dark:bg-yellow-950">
																										<AlertTriangle className="text-yellow-600 dark:text-yellow-400" />
																										<span className="text-sm text-yellow-600 dark:text-yellow-400">
																											You have active services,
																											please delete them first
																										</span>
																									</div>
																								) : (
																									<AlertDialogDescription>
																										This action cannot be undone
																									</AlertDialogDescription>
																								)}
																							</AlertDialogHeader>
																							<AlertDialogFooter>
																								<AlertDialogCancel>
																									Cancel
																								</AlertDialogCancel>
																								<AlertDialogAction
																									disabled={!emptyServices}
																									onClick={async () => {
																										await mutateAsync({
																											projectId:
																												project.projectId,
																										})
																											.then(() => {
																												toast.success(
																													"Project deleted successfully",
																												);
																											})
																											.catch(() => {
																												toast.error(
																													"Error deleting this project",
																												);
																											})
																											.finally(() => {
																												utils.project.all.invalidate();
																											});
																									}}
																								>
																									Delete
																								</AlertDialogAction>
																							</AlertDialogFooter>
																						</AlertDialogContent>
																					</AlertDialog>
																				)}
																			</div>
																		</DropdownMenuContent>
																	</DropdownMenu>
																</div>
															</div>
														</div>
														<div className="studio-card-body mt-auto flex items-center justify-between gap-4 pt-0 max-sm:flex-wrap">
															<DateTooltip date={project.createdAt}>
																Created
															</DateTooltip>
															<span className="studio-font-mono text-xs text-muted-foreground">
																{totalServices}{" "}
																{totalServices === 1 ? "service" : "services"}
															</span>
														</div>
													</article>
												</div>
											);
										})}
									</div>
								</>
							)}
				</div>
			</div>
		</>
	);
};
