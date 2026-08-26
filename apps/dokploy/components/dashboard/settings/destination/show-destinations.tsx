import { Database, FolderUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DialogAction } from "@/components/shared/dialog-action";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonCard } from "@/components/shared/skeleton-card";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";
import { HandleDestinations } from "./handle-destinations";

export const ShowDestinations = () => {
	const { data, isPending, refetch } = api.destination.all.useQuery();
	const { mutateAsync, isPending: isRemoving } =
		api.destination.remove.useMutation();
	const { data: permissions } = api.user.getPermissions.useQuery();
	return (
		<div className="w-full">
			<Card className="h-full bg-sidebar  p-2.5 rounded-xl  max-w-5xl mx-auto">
				<div className="rounded-xl bg-background shadow-md ">
					<CardHeader className="">
						<CardTitle className="text-xl flex flex-row gap-2">
							<Database className="size-6 text-muted-foreground self-center" />
							S3 Destinations
						</CardTitle>
						<CardDescription>
							Add your providers like AWS S3, Cloudflare R2, Wasabi,
							DigitalOcean Spaces etc.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 py-8 border-t">
						{isPending ? (
							<div className="min-h-[25vh]">
								<SkeletonCard />
							</div>
						) : (
							<>
								{data?.length === 0 ? (
									<EmptyState
										icon={
											<FolderUp className="size-8 text-muted-foreground/60" />
										}
										title="No backup destinations configured"
										description="Set up at least one S3-compatible destination to enable backups."
										className="min-h-[25vh]"
										action={
											permissions?.destination.create ? (
												<HandleDestinations />
											) : undefined
										}
									/>
								) : (
									<div className="flex flex-col gap-4  min-h-[25vh]">
										<div className="flex flex-col gap-4 rounded-lg ">
											{data?.map((destination, index) => (
												<div
													key={destination.destinationId}
													className="flex items-center justify-between bg-sidebar p-1 w-full rounded-lg"
												>
													<div className="flex items-center justify-between p-3.5 rounded-lg bg-background border  w-full">
														<div className="flex flex-col gap-1">
															<span className="text-sm">
																{index + 1}. {destination.name}
															</span>
															<span className="text-xs text-muted-foreground">
																Created at:{" "}
																{new Date(
																	destination.createdAt,
																).toLocaleDateString()}
															</span>
														</div>
														<div className="flex flex-row gap-1">
															<HandleDestinations
																destinationId={destination.destinationId}
															/>
															{permissions?.destination.delete && (
																<DialogAction
																	title="Delete Destination"
																	description="Are you sure you want to delete this destination?"
																	type="destructive"
																	onClick={async () => {
																		await mutateAsync({
																			destinationId: destination.destinationId,
																		})
																			.then(() => {
																				toast.success(
																					"Destination deleted successfully",
																				);
																				refetch();
																			})
																			.catch(() => {
																				toast.error(
																					"Error deleting destination",
																				);
																			});
																	}}
																>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="group hover:bg-red-500/10 "
																		isLoading={isRemoving}
																	>
																		<Trash2 className="size-4 text-primary group-hover:text-red-500" />
																	</Button>
																</DialogAction>
															)}
														</div>
													</div>
												</div>
											))}
										</div>

										{permissions?.destination.create && (
											<div className="flex flex-row gap-2 flex-wrap w-full justify-end mr-4">
												<HandleDestinations />
											</div>
										)}
									</div>
								)}
							</>
						)}
					</CardContent>
				</div>
			</Card>
		</div>
	);
};
