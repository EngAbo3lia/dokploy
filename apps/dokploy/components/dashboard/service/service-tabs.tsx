import type * as React from "react";

import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ServiceTabItem = {
	value: string;
	label: string;
};

export function ServiceTabsList({
	tabs,
	className,
}: {
	tabs: ServiceTabItem[];
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex w-full flex-row items-center overflow-x-auto",
				className,
			)}
		>
			<TabsList
				variant="line"
				className="flex h-full w-fit items-center justify-start gap-3 rounded-none bg-transparent p-0 max-md:gap-3"
			>
				{tabs.map((tab) => (
					<TabsTrigger key={tab.value} value={tab.value} className="h-9 px-2">
						{tab.label}
					</TabsTrigger>
				))}
			</TabsList>
		</div>
	);
}

export function ServiceTabs({
	value,
	onValueChange,
	tabs,
	children,
	className,
}: {
	value: string;
	onValueChange: (value: string) => void;
	tabs: ServiceTabItem[];
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<Tabs
			value={value}
			onValueChange={onValueChange}
			className={cn("w-full", className)}
		>
			<ServiceTabsList tabs={tabs} />
			{children}
		</Tabs>
	);
}
