import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { Folder, HelpCircle, ArrowRight, Rocket } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { slugify } from "@/lib/slug";
import { api } from "@/utils/api";
import { APP_NAME_MESSAGE, APP_NAME_REGEX } from "@/utils/schema";
import { useRouter } from "next/router";

// Import existing config components
import { ShowProviderForm } from "@/components/dashboard/application/general/generic/show";
import { ShowBuildChooseForm } from "@/components/dashboard/application/build/show";
import { ShowEnvironment } from "@/components/dashboard/application/environment/show";

const AddTemplateSchema = z.object({
	name: z.string().min(1, { message: "Name is required" }),
	appName: z
		.string()
		.min(1, { message: "App name is required" })
		.regex(APP_NAME_REGEX, { message: APP_NAME_MESSAGE }),
	description: z.string().optional(),
	serverId: z.string().optional(),
});

type AddTemplate = z.infer<typeof AddTemplateSchema>;

interface Props {
	environmentId: string;
	projectId: string;
	projectName?: string;
}

export const ApplicationWizard = ({ environmentId, projectId, projectName }: Props) => {
	const utils = api.useUtils();
	const router = useRouter();
	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: webServerSettings } = api.settings.getWebServerSettings.useQuery();
	const showLocalOption = !isCloud && !webServerSettings?.remoteServersOnly;
	
	const [visible, setVisible] = useState(false);
	const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
	const [createdAppId, setCreatedAppId] = useState<string | null>(null);
	
	const slug = slugify(projectName);
	const { data: servers } = api.server.withSSHKey.useQuery();

	const hasServers = servers && servers.length > 0;
	const shouldShowServerDropdown = hasServers;

	const { mutateAsync, isPending: isCreating, error, isError } =
		api.application.create.useMutation();
        
    const { mutateAsync: deploy, isPending: isDeploying } =
		api.application.deploy.useMutation();

	const form = useForm<AddTemplate>({
		defaultValues: {
			name: "",
			appName: `${slug}-`,
			description: "",
		},
		resolver: zodResolver(AddTemplateSchema),
	});

	const onSubmit = async (data: AddTemplate) => {
		await mutateAsync({
			name: data.name,
			appName: data.appName,
			description: data.description,
			serverId: data.serverId === "dokploy" ? undefined : data.serverId,
			environmentId,
		})
			.then(async (result) => {
				toast.success("Service created successfully!");
				setCreatedAppId(result.applicationId);
				await utils.environment.one.invalidate({ environmentId });
                setStep(2); 
			})
			.catch(() => {
				toast.error("Error creating the service");
			});
	};
    
    const handleDeploy = async () => {
        if (!createdAppId) return;
        
        await deploy({ applicationId: createdAppId })
            .then(() => {
                toast.success("Deployment triggered!");
                setVisible(false);
                setStep(1);
                form.reset();
                router.push(`/dashboard/project/${projectId}/environment/${environmentId}/services/application/${createdAppId}?tab=deployments`);
            })
            .catch((error) => {
                toast.error(error?.message || "Error deploying application");
            });
    }

	return (
		<Dialog open={visible} onOpenChange={(open) => {
            if (!open) {
                setStep(1);
                setCreatedAppId(null);
                form.reset();
            }
            setVisible(open);
        }}>
			<DialogTrigger className="w-full">
				<DropdownMenuItem
					className="w-full cursor-pointer space-x-3"
					onSelect={(e) => e.preventDefault()}
				>
					<Folder className="size-4 text-muted-foreground" />
					<span>Application</span>
				</DropdownMenuItem>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
                        {step === 1 && "Step 1: Basics"}
                        {step === 2 && "Step 2: Source Provider"}
                        {step === 3 && "Step 3: Environment & Build"}
                        {step === 4 && "Step 4: Ready to Deploy"}
                    </DialogTitle>
					<DialogDescription>
                        {step === 1 && "Assign a name and description to your application"}
                        {step === 2 && "Select your code repository or docker image"}
                        {step === 3 && "Configure environment variables and build settings"}
                        {step === 4 && "Review and trigger the first deployment"}
					</DialogDescription>
				</DialogHeader>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <span className={step >= 1 ? "text-primary font-medium" : ""}>Basics</span>
                    <ArrowRight className="size-3" />
                    <span className={step >= 2 ? "text-primary font-medium" : ""}>Source</span>
                    <ArrowRight className="size-3" />
                    <span className={step >= 3 ? "text-primary font-medium" : ""}>Build & Env</span>
                    <ArrowRight className="size-3" />
                    <span className={step >= 4 ? "text-primary font-medium" : ""}>Deploy</span>
                </div>

                {step === 1 && (
                    <div className="space-y-4">
                        {isError && <AlertBlock type="error">{error?.message}</AlertBlock>}
                        <Form {...form}>
                            <form
                                id="hook-form-wizard"
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="grid w-full gap-4"
                            >
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Frontend"
                                                    {...field}
                                                    onChange={(e) => {
                                                        const val = e.target.value || "";
                                                        const serviceName = slugify(val.trim());
                                                        form.setValue("appName", `${slug}-${serviceName}`);
                                                        field.onChange(val);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {shouldShowServerDropdown && (
                                    <FormField
                                        control={form.control}
                                        name="serverId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <TooltipProvider delayDuration={0}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <FormLabel className="break-all w-fit flex flex-row gap-1 items-center">
                                                                Select a Server{" "}
                                                                {showLocalOption ? "(Optional)" : ""}
                                                                <HelpCircle className="size-4 text-muted-foreground" />
                                                            </FormLabel>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="z-999 w-[300px]" align="start" side="top">
                                                            <span>
                                                                If no server is selected, the application will be
                                                                deployed on the server where the user is logged in.
                                                            </span>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value || (showLocalOption ? "dokploy" : undefined)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue
                                                            placeholder={showLocalOption ? "Dokploy" : "Select a Server"}
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            {showLocalOption && (
                                                                <SelectItem value="dokploy">
                                                                    <span className="flex items-center gap-2 justify-between w-full">
                                                                        <span>Dokploy</span>
                                                                        <span className="text-muted-foreground text-xs self-center">
                                                                            Default
                                                                        </span>
                                                                    </span>
                                                                </SelectItem>
                                                            )}
                                                            {servers?.map((server) => (
                                                                <SelectItem key={server.serverId} value={server.serverId}>
                                                                    <span className="flex items-center gap-2 justify-between w-full">
                                                                        <span>{server.name}</span>
                                                                        <span className="text-muted-foreground text-xs self-center">
                                                                            {server.ipAddress}
                                                                        </span>
                                                                    </span>
                                                                </SelectItem>
                                                            ))}
                                                            <SelectLabel>
                                                                Servers ({servers?.length + (showLocalOption ? 1 : 0)})
                                                            </SelectLabel>
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                <FormField
                                    control={form.control}
                                    name="appName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                App Name
                                                <TooltipProvider delayDuration={0}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <HelpCircle className="size-4 text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right">
                                                            <p>This will be the name of the Docker Swarm service</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="my-app" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Description of your service..."
                                                    className="resize-none"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                            <DialogFooter className="mt-4">
                                <Button isLoading={isCreating} form="hook-form-wizard" type="submit">
                                    Continue to Source <ArrowRight className="ml-2 size-4" />
                                </Button>
                            </DialogFooter>
                        </Form>
                    </div>
                )}

                {step === 2 && createdAppId && (
                    <div className="space-y-6">
                        <ShowProviderForm applicationId={createdAppId} />
                        
                        <DialogFooter className="flex justify-between sm:justify-between w-full mt-4 border-t pt-4">
                            <Button variant="ghost" onClick={() => setStep(3)}>
                                Skip for now
                            </Button>
                            <Button onClick={() => setStep(3)}>
                                Continue to Build & Env <ArrowRight className="ml-2 size-4" />
                            </Button>
                        </DialogFooter>
                    </div>
                )}
                
                {step === 3 && createdAppId && (
                    <div className="space-y-6">
                        <ShowBuildChooseForm applicationId={createdAppId} />
                        <ShowEnvironment applicationId={createdAppId} />
                        
                        <DialogFooter className="flex justify-between sm:justify-between w-full mt-4 border-t pt-4">
                            <Button variant="ghost" onClick={() => setStep(2)}>
                                Back
                            </Button>
                            <Button onClick={() => setStep(4)}>
                                Continue to Deploy <ArrowRight className="ml-2 size-4" />
                            </Button>
                        </DialogFooter>
                    </div>
                )}
                
                {step === 4 && createdAppId && (
                    <div className="space-y-6 flex flex-col items-center justify-center py-8">
                        <div className="p-6 bg-muted/30 rounded-full mb-4">
                            <Rocket className="size-12 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-center">Ready to launch!</h3>
                        <p className="text-muted-foreground text-center max-w-sm mb-6">
                            Your application has been configured. Click deploy to start building and spinning up your containers. You will be redirected to the Live Trace console.
                        </p>
                        
                        <DialogFooter className="flex justify-center w-full gap-4">
                            <Button variant="outline" onClick={() => {
                                setVisible(false);
                                router.push(`/dashboard/project/${projectId}/environment/${environmentId}/services/application/${createdAppId}`);
                            }}>
                                Save & Exit
                            </Button>
                            <Button size="lg" isLoading={isDeploying} onClick={handleDeploy}>
                                <Rocket className="mr-2 size-4" /> Deploy & Trace
                            </Button>
                        </DialogFooter>
                    </div>
                )}

			</DialogContent>
		</Dialog>
	);
};
