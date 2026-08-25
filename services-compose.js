import { dirname, join } from "node:path";
import { paths } from "../constants/index.js";
import { db } from "../db/index.js";
import { buildAppName, cleanAppName, compose, } from "../db/schema/index.js";
import { getBuildComposeCommand, ROLLBACK_OK_MARKER, } from "../utils/builders/compose.js";
import { randomizeSpecificationFile } from "../utils/docker/compose.js";
import { cloneCompose, getComposePath, loadDockerCompose, loadDockerComposeRemote, } from "../utils/docker/domain.js";
import { sendBuildErrorNotifications } from "../utils/notifications/build-error.js";
import { sendBuildSuccessNotifications } from "../utils/notifications/build-success.js";
import { ExecError, execAsync, execAsyncRemote, } from "../utils/process/execAsync.js";
import { cloneBitbucketRepository } from "../utils/providers/bitbucket.js";
import { cloneGitRepository, getGitCommitInfo, } from "../utils/providers/git.js";
import { cloneGiteaRepository } from "../utils/providers/gitea.js";
import { cloneGithubRepository } from "../utils/providers/github.js";
import { cloneGitlabRepository } from "../utils/providers/gitlab.js";
import { getCreateComposeFileCommand } from "../utils/providers/raw.js";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { quote } from "shell-quote";
import { encodeBase64 } from "../utils/docker/utils.js";
import { getDokployUrl } from "./admin.js";
import { createDeploymentCompose, updateDeployment, updateDeploymentStatus, } from "./deployment.js";
import { generateApplyPatchesCommand } from "./patch.js";
import { validUniqueServerAppName } from "./project.js";
export const createCompose = async (input) => {
    const appName = buildAppName("compose", input.appName);
    const valid = await validUniqueServerAppName(appName);
    if (!valid) {
        throw new TRPCError({
            code: "CONFLICT",
            message: "Service with this 'AppName' already exists",
        });
    }
    const newDestination = await db
        .insert(compose)
        .values({
        ...input,
        composeFile: input.composeFile || "",
        appName,
    })
        .returning()
        .then((value) => value[0]);
    if (!newDestination) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Error input: Inserting compose",
        });
    }
    return newDestination;
};
export const createComposeByTemplate = async (input) => {
    const appName = cleanAppName(input.appName);
    if (appName) {
        const valid = await validUniqueServerAppName(appName);
        if (!valid) {
            throw new TRPCError({
                code: "CONFLICT",
                message: "Service with this 'AppName' already exists",
            });
        }
    }
    const newDestination = await db
        .insert(compose)
        .values({
        ...input,
        appName,
    })
        .returning()
        .then((value) => value[0]);
    if (!newDestination) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Error input: Inserting compose",
        });
    }
    return newDestination;
};
export const findComposeById = async (composeId) => {
    const result = await db.query.compose.findFirst({
        where: eq(compose.composeId, composeId),
        with: {
            environment: {
                with: {
                    project: true,
                },
            },
            deployments: true,
            mounts: true,
            domains: true,
            github: true,
            gitlab: true,
            bitbucket: true,
            gitea: true,
            server: true,
            backups: {
                with: {
                    destination: {
                        columns: {
                            accessKey: false,
                            secretAccessKey: false,
                        },
                    },
                    deployments: true,
                },
            },
        },
    });
    if (!result) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Compose not found",
        });
    }
    return result;
};
export const loadServices = async (composeId, type = "fetch") => {
    const compose = await findComposeById(composeId);
    if (type === "fetch") {
        const command = await cloneCompose(compose);
        if (compose.serverId) {
            await execAsyncRemote(compose.serverId, command);
        }
        else {
            await execAsync(command);
        }
    }
    let composeData;
    if (compose.serverId) {
        composeData = await loadDockerComposeRemote(compose);
    }
    else {
        composeData = await loadDockerCompose(compose);
    }
    if (compose.randomize && composeData) {
        const randomizedCompose = randomizeSpecificationFile(composeData, compose.suffix);
        composeData = randomizedCompose;
    }
    if (!composeData?.services) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Services not found",
        });
    }
    const services = Object.keys(composeData.services);
    return [...services];
};
export const updateCompose = async (composeId, composeData) => {
    const { appName, ...rest } = composeData;
    const composeResult = await db
        .update(compose)
        .set({
        ...rest,
    })
        .where(eq(compose.composeId, composeId))
        .returning();
    return composeResult[0];
};
export const didRollbackSucceed = async (compose, logPath, deploymentId) => {
    const command = `if grep -q '^${ROLLBACK_OK_MARKER}:${deploymentId}$' "${logPath}" 2>/dev/null; then echo "LIVE_OK"; else echo "LIVE_FAILED"; fi`;
    try {
        if (compose.serverId) {
            const { stdout } = await execAsyncRemote(compose.serverId, command);
            return stdout.trim() === "LIVE_OK";
        }
        const { stdout } = await execAsync(command);
        return stdout.trim() === "LIVE_OK";
    }
    catch {
        return false;
    }
};
export const backupCurrentDeployment = async (compose, logPath) => {
    const { COMPOSE_PATH } = paths(!!compose.serverId);
    const backupDir = join(COMPOSE_PATH, compose.appName, ".deploy-backup");
    const composeFilePath = getComposePath(compose);
    const envFilePath = join(dirname(composeFilePath), ".env");
    const backupCommand = `
mkdir -p ${quote([backupDir])} 2>/dev/null || exit 1;
if [ -f ${quote([composeFilePath])} ]; then cp ${quote([composeFilePath])} ${quote([join(backupDir, "docker-compose.yml.bak")])} || exit 1; else echo "No previous compose file found"; fi
if [ -f ${quote([envFilePath])} ]; then cp ${quote([envFilePath])} ${quote([join(backupDir, "env.bak")])} || exit 1; else echo "No previous env file found"; fi
	`;
    const command = `(${backupCommand}) >> ${logPath} 2>&1`;
    if (compose.serverId) {
        await execAsyncRemote(compose.serverId, command);
    }
    else {
        await execAsync(command);
    }
};
export const deployCompose = async ({ composeId, titleLog = "Manual deployment", descriptionLog = "", }) => {
    const compose = await findComposeById(composeId);
    const buildLink = `${await getDokployUrl()}/dashboard/project/${compose.environment.projectId}/environment/${compose.environmentId}/services/compose/${compose.composeId}?tab=deployments`;
    const deployment = await createDeploymentCompose({
        composeId: composeId,
        title: titleLog,
        description: descriptionLog,
    });
    try {
        await backupCurrentDeployment(compose, deployment.logPath);
        const entity = {
            ...compose,
            type: "compose",
        };
        let command = "set -e;";
        if (compose.sourceType === "github") {
            command += await cloneGithubRepository(entity);
        }
        else if (compose.sourceType === "gitlab") {
            command += await cloneGitlabRepository(entity);
        }
        else if (compose.sourceType === "bitbucket") {
            command += await cloneBitbucketRepository(entity);
        }
        else if (compose.sourceType === "git") {
            command += await cloneGitRepository(entity);
        }
        else if (compose.sourceType === "gitea") {
            command += await cloneGiteaRepository(entity);
        }
        else if (compose.sourceType === "raw") {
            command += getCreateComposeFileCommand(entity);
        }
        let commandWithLog = `(${command}) >> ${deployment.logPath} 2>&1`;
        if (compose.serverId) {
            await execAsyncRemote(compose.serverId, commandWithLog);
        }
        else {
            await execAsync(commandWithLog);
        }
        if (compose.sourceType !== "raw") {
            command = "set -e;";
            command += await generateApplyPatchesCommand({
                id: compose.composeId,
                type: "compose",
                serverId: compose.serverId,
            });
            commandWithLog = `(${command}) >> ${deployment.logPath} 2>&1`;
            if (compose.serverId) {
                await execAsyncRemote(compose.serverId, commandWithLog);
            }
            else {
                await execAsync(commandWithLog);
            }
        }
        command = "set -e;";
        command += await getBuildComposeCommand(entity, deployment.deploymentId);
        commandWithLog = `(${command}) >> ${deployment.logPath} 2>&1`;
        if (compose.serverId) {
            await execAsyncRemote(compose.serverId, commandWithLog);
        }
        else {
            await execAsync(commandWithLog);
        }
        await updateDeploymentStatus(deployment.deploymentId, "done");
        await updateCompose(composeId, {
            composeStatus: "done",
        });
        await sendBuildSuccessNotifications({
            projectName: compose.environment.project.name,
            applicationName: compose.name,
            applicationType: "compose",
            buildLink,
            organizationId: compose.environment.project.organizationId,
            domains: compose.domains,
            environmentName: compose.environment.name,
        });
    }
    catch (error) {
        let command = "";
        // Only log details for non-ExecError errors
        if (!(error instanceof ExecError)) {
            const message = error instanceof Error ? error.message : String(error);
            const encodedMessage = encodeBase64(message);
            command += `echo "${encodedMessage}" | base64 -d >> "${deployment.logPath}";`;
        }
        command += `echo "\nError occurred ❌, check the logs for details." >> ${deployment.logPath};`;
        if (compose.serverId) {
            await execAsyncRemote(compose.serverId, command);
        }
        else {
            await execAsync(command);
        }
        await updateDeploymentStatus(deployment.deploymentId, "error");
        const rollbackSucceeded = await didRollbackSucceed(compose, deployment.logPath, deployment.deploymentId);
        await updateCompose(composeId, {
            composeStatus: rollbackSucceeded ? "done" : "error",
        });
        await sendBuildErrorNotifications({
            projectName: compose.environment.project.name,
            applicationName: compose.name,
            applicationType: "compose",
            // @ts-expect-error
            errorMessage: error?.message || "Error building",
            buildLink,
            organizationId: compose.environment.project.organizationId,
        });
        throw error;
    }
    finally {
        if (compose.sourceType !== "raw") {
            const commitInfo = await getGitCommitInfo({
                ...compose,
                type: "compose",
            });
            if (commitInfo) {
                await updateDeployment(deployment.deploymentId, {
                    title: commitInfo.message,
                    description: `Commit: ${commitInfo.hash}`,
                });
            }
        }
    }
};
export const rebuildCompose = async ({ composeId, titleLog = "Rebuild deployment", descriptionLog = "", }) => {
    const compose = await findComposeById(composeId);
    const deployment = await createDeploymentCompose({
        composeId: composeId,
        title: titleLog,
        description: descriptionLog,
    });
    try {
        await backupCurrentDeployment(compose, deployment.logPath);
        let command = "set -e;";
        if (compose.sourceType === "raw") {
            command += getCreateComposeFileCommand(compose);
        }
        let commandWithLog = `(${command}) >> ${deployment.logPath} 2>&1`;
        if (compose.serverId) {
            await execAsyncRemote(compose.serverId, commandWithLog);
        }
        else {
            await execAsync(commandWithLog);
        }
        if (compose.sourceType !== "raw") {
            command = "set -e;";
            command += await generateApplyPatchesCommand({
                id: compose.composeId,
                type: "compose",
                serverId: compose.serverId,
            });
            commandWithLog = `(${command}) >> ${deployment.logPath} 2>&1`;
            if (compose.serverId) {
                await execAsyncRemote(compose.serverId, commandWithLog);
            }
            else {
                await execAsync(commandWithLog);
            }
        }
        command = "set -e;";
        command += await getBuildComposeCommand(compose, deployment.deploymentId);
        commandWithLog = `(${command}) >> ${deployment.logPath} 2>&1`;
        if (compose.serverId) {
            await execAsyncRemote(compose.serverId, commandWithLog);
        }
        else {
            await execAsync(commandWithLog);
        }
        await updateDeploymentStatus(deployment.deploymentId, "done");
        await updateCompose(composeId, {
            composeStatus: "done",
        });
    }
    catch (error) {
        let command = "";
        // Only log details for non-ExecError errors
        if (!(error instanceof ExecError)) {
            const message = error instanceof Error ? error.message : String(error);
            const encodedMessage = encodeBase64(message);
            command += `echo "${encodedMessage}" | base64 -d >> "${deployment.logPath}";`;
        }
        command += `echo "\nError occurred ❌, check the logs for details." >> ${deployment.logPath};`;
        if (compose.serverId) {
            await execAsyncRemote(compose.serverId, command);
        }
        else {
            await execAsync(command);
        }
        await updateDeploymentStatus(deployment.deploymentId, "error");
        const rollbackSucceeded = await didRollbackSucceed(compose, deployment.logPath, deployment.deploymentId);
        await updateCompose(composeId, {
            composeStatus: rollbackSucceeded ? "done" : "error",
        });
        throw error;
    }
    return true;
};
export const removeCompose = async (compose, deleteVolumes) => {
    try {
        const { COMPOSE_PATH } = paths(!!compose.serverId);
        const projectPath = join(COMPOSE_PATH, compose.appName);
        if (compose.composeType === "stack") {
            const command = `
			docker network disconnect ${compose.appName} dokploy-traefik;
			docker stack rm ${compose.appName};
			rm -rf ${projectPath}`;
            if (compose.serverId) {
                await execAsyncRemote(compose.serverId, command);
            }
            else {
                await execAsync(command);
            }
        }
        else {
            const command = `
			docker network disconnect ${compose.appName} dokploy-traefik;
			env -i PATH="$PATH" docker compose -p ${compose.appName} down ${deleteVolumes ? "--volumes" : ""};
			rm -rf ${projectPath}`;
            if (compose.serverId) {
                await execAsyncRemote(compose.serverId, command);
            }
            else {
                await execAsync(command);
            }
        }
    }
    catch (error) {
        throw error;
    }
    return true;
};
export const startCompose = async (composeId) => {
    const compose = await findComposeById(composeId);
    try {
        const { COMPOSE_PATH } = paths(!!compose.serverId);
        const projectPath = join(COMPOSE_PATH, compose.appName, "code");
        const path = compose.sourceType === "raw" ? "docker-compose.yml" : compose.composePath;
        const baseCommand = `env -i PATH="$PATH" docker compose -p ${quote([compose.appName])} -f ${quote([path])} up -d`;
        if (compose.composeType === "docker-compose") {
            if (compose.serverId) {
                await execAsyncRemote(compose.serverId, `cd ${projectPath} && ${baseCommand}`);
            }
            else {
                await execAsync(baseCommand, {
                    cwd: projectPath,
                });
            }
        }
        await updateCompose(composeId, {
            composeStatus: "done",
        });
    }
    catch (error) {
        await updateCompose(composeId, {
            composeStatus: "idle",
        });
        throw error;
    }
    return true;
};
export const stopCompose = async (composeId) => {
    const compose = await findComposeById(composeId);
    try {
        const { COMPOSE_PATH } = paths(!!compose.serverId);
        if (compose.composeType === "docker-compose") {
            if (compose.serverId) {
                await execAsyncRemote(compose.serverId, `cd ${join(COMPOSE_PATH, compose.appName)} && env -i PATH="$PATH" docker compose -p ${compose.appName} stop`);
            }
            else {
                await execAsync(`env -i PATH="$PATH" docker compose -p ${compose.appName} stop`, {
                    cwd: join(COMPOSE_PATH, compose.appName),
                });
            }
        }
        if (compose.composeType === "stack") {
            if (compose.serverId) {
                await execAsyncRemote(compose.serverId, `docker stack rm ${compose.appName}`);
            }
            else {
                await execAsync(`docker stack rm ${compose.appName}`);
            }
        }
        await updateCompose(composeId, {
            composeStatus: "idle",
        });
    }
    catch (error) {
        await updateCompose(composeId, {
            composeStatus: "error",
        });
        throw error;
    }
    return true;
};
