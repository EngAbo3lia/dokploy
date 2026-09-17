import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 h-6 text-[11px] font-semibold whitespace-nowrap transition-all duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg:not(.cursor-pointer)]:pointer-events-none [&>svg]:size-3!",
	{
		variants: {
			variant: {
				default:
					"border-primary/20 bg-primary/10 text-primary [a]:hover:bg-primary/20",
				secondary:
					"border-border bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
				destructive:
					"border-destructive/20 bg-destructive/10 text-destructive shadow-[0_0_6px_rgba(244,63,94,0.4)] focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
				outline:
					"border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
				ghost:
					"hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
				link: "text-primary underline-offset-4 hover:underline",
				red: "select-none items-center whitespace-nowrap font-semibold bg-destructive/10 text-destructive border border-destructive/20 text-[10px] h-5 px-2 py-1 rounded-full shadow-[0_0_6px_rgba(244,63,94,0.4)]",
				yellow:
					"select-none items-center whitespace-nowrap font-semibold bg-warning/10 dark:text-warning text-warning border border-warning/20 text-[10px] h-5 px-2 py-1 rounded-full",
				orange:
					"select-none items-center whitespace-nowrap font-semibold bg-warning/10 text-warning border border-warning/20 text-[10px] h-5 px-2 py-1 rounded-full",
				green:
					"select-none items-center whitespace-nowrap font-semibold bg-success/10 dark:text-success text-success border border-success/20 text-[10px] h-5 px-2 py-1 rounded-full",
				blue: "select-none items-center whitespace-nowrap font-semibold bg-info/10 dark:text-info text-info border border-info/20 text-[10px] h-5 px-2 py-1 rounded-full",
				blank:
					"select-none items-center whitespace-nowrap font-semibold dark:bg-white/10 bg-black/10 text-foreground border border-border text-[10px] h-5 px-2 py-1 rounded-full",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Badge({
	className,
	variant = "default",
	asChild = false,
	...props
}: React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : "span";

	return (
		<Comp
			data-slot="badge"
			data-variant={variant}
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
