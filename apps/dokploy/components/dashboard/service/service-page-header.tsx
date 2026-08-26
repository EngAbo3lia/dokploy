import copy from "copy-to-clipboard";
import { HelpCircle } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function ServicePageHeader({
	icon,
	statusDot,
	title,
	titleSub,
	description,
	badges,
	serverName,
	ipAddress,
	serverStatus,
	fallbackIp,
	actions,
}: {
	icon: React.ReactNode;
	statusDot: React.ReactNode;
	title: string;
	titleSub?: React.ReactNode;
	description?: string | null;
	badges?: React.ReactNode;
	serverName?: string | null;
	ipAddress?: string | null;
	serverStatus?: string;
	fallbackIp?: string | null;
	actions?: React.ReactNode;
}) {
	return (
		<CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
			<div className="flex min-w-0 flex-row items-center gap-4">
				<div className="relative shrink-0">
					{icon}
					<div className="absolute -right-1 -top-2 z-10">{statusDot}</div>
				</div>
				<div className="flex min-w-0 flex-col gap-1">
					<CardTitle className="truncate text-xl leading-tight">
						{title}
					</CardTitle>
					{titleSub}
					{description && (
						<CardDescription className="truncate">
							{description}
						</CardDescription>
					)}
				</div>
			</div>
			<div className="flex shrink-0 flex-col gap-2">
				{badges && (
					<div className="flex flex-row flex-wrap justify-start gap-2 md:justify-end">
						{badges}
					</div>
				)}
				<div className="flex flex-row flex-wrap items-center justify-start gap-2 md:justify-end">
					<Badge
						className="cursor-pointer"
						onClick={() => {
							const ip = ipAddress || fallbackIp;
							if (ip) {
								copy(ip);
								toast.success("IP Address Copied!");
							}
						}}
						variant={
							!ipAddress || serverStatus === "active"
								? "default"
								: "destructive"
						}
					>
						{serverName || "Dokploy Server"}
					</Badge>
					{serverStatus === "inactive" && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Label className="flex w-fit flex-row items-center gap-1">
										<HelpCircle className="size-4 text-muted-foreground" />
									</Label>
								</TooltipTrigger>
								<TooltipContent
									className="z-999 w-[300px]"
									align="start"
									side="top"
								>
									<span>
										You cannot deploy this service because the server is
										inactive. Upgrade your plan to add more servers.
									</span>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
					{actions}
				</div>
			</div>
		</CardHeader>
	);
}
