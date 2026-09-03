<div align="center">
  <a href="https://dokploy.com">
    <img src=".github/sponsors/logo.png" alt="Dokploy - Open Source Alternative to Vercel, Heroku and Netlify." width="100%"  />
  </a>
  </br>
  </br>
  <p>Join us on Discord for help, feedback, and discussions!</p>
  <a href="https://discord.gg/2tBnJ3jDJc">
    <img src="https://discordapp.com/api/guilds/1234073262418563112/widget.png?style=banner2" alt="Discord Shield"/>
  </a>
</div>
<br />


Dokploy is a free, self-hostable Platform as a Service (PaaS) that simplifies the deployment and management of applications and databases.

## ✨ Features

Dokploy includes multiple features to make your life easier.

- **Applications**: Deploy any type of application (Node.js, PHP, Python, Go, Ruby, etc.).
- **Databases**: Create and manage databases with support for MySQL, PostgreSQL, MongoDB, MariaDB, libsql, and Redis.
- **Backups**: Automate backups for databases to an external storage destination.
- **Docker Compose**: Native support for Docker Compose to manage complex applications.
- **Multi Node**: Scale applications to multiple nodes using Docker Swarm to manage the cluster.
- **Templates**: Deploy open-source templates (Plausible, Pocketbase, Calcom, etc.) with a single click.
- **Traefik Integration**: Automatically integrates with Traefik for routing and load balancing.
- **Real-time Monitoring**: Monitor CPU, memory, storage, and network usage for every resource.
- **Docker Management**: Easily deploy and manage Docker containers.
- **CLI/API**: Manage your applications and databases using the command line or through the API.
- **Notifications**: Get notified when your deployments succeed or fail (via Slack, Discord, Telegram, Email, etc.).
- **Multi Server**: Deploy and manage your applications remotely to external servers.
- **Self-Hosted**: Self-host Dokploy on your VPS.

## 🚀 Getting Started

To get started, run the following command on a VPS:

Want to skip the installation process? [Try the Dokploy Cloud](https://app.dokploy.com).

```bash
curl -sSL https://dokploy.com/install.sh | bash
```

For detailed documentation, visit [docs.dokploy.com](https://docs.dokploy.com).


[Github Sponsors](https://github.com/sponsors/Siumauricio)

### Contributors 🤝

<a href="https://github.com/dokploy/dokploy/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=dokploy/dokploy" alt="Contributors" />
</a>

## 📺 Video Tutorial

<a href="https://youtu.be/mznYKPvhcfw">
  <img src="https://dokploy.com/banner.png" alt="Watch the video" width="400"/>
</a>

## 🤝 Contributing

Check out the [Contributing Guide](CONTRIBUTING.md) for more information.

## 🚢 Aboalia Fork — Production Deployment

This repository is the **Aboalia fork** of Dokploy, with custom features (deployment detail pages, domain verification/SSL, auto-rollback, Vercel-tier UI overhaul) on top of upstream canary.

**Production image:** `aboalia/dokploy:aboalia` (built by CI in Node 24.4.0)

### Deploy to Production (Proxmox console)

```bash
# Pull the latest image
docker pull aboalia/dokploy:aboalia

# Rolling update (stop-first avoids port 3000 conflict)
docker service update --image aboalia/dokploy:aboalia --update-order stop-first --force dokploy

# Verify
docker service ps dokploy --format "table {{.Name}}\t{{.Image}}\t{{.TaskState}}"
docker service logs dokploy --tail 50 --since 2m
```

### Rollback

```bash
docker service update --detach=false --update-order stop-first --image dokploy-cc:v0.30.2-cc2 dokploy
```

### Branch Model

| Branch | Purpose |
|--------|---------|
| `aboalia` | Primary stable branch (GitHub default) |
| `feat/*` | Feature branches, merge into `aboalia` |
| `upstream` remote | Periodic sync from `Dokploy/dokploy` canary |

To sync upstream canary into `aboalia`:

```bash
./scripts/sync-upstream.sh --push
```

### Upstream Sync History

| Date | Upstream | Our Branch | Status |
|------|----------|------------|--------|
| 2026-09-03 | v0.30.5 (152 commits) | aboalia | ✅ merged, CI built, locally verified |
