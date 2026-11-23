[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/supergateway?utm_medium=integration&utm_source=button&utm_campaign=supergateway)

# Supergateway on Railway

This repo is the Railway template for [Supergateway](https://github.com/supercorp-ai/supergateway) (MIT). Supergateway runs stdio MCP servers and serves them over remote transports. The template serves them on one Streamable HTTP URL, protected by an API key.

## What it deploys

One service, built from this repo's `Dockerfile`:

- `supercorp/supergateway:4.2.3-uvx@sha256:050f1dfe8ff9fa7535e0557313a100d2da7d1731ed571cfaba6cc54fce3de234`. This is the official image with Node and Python/uv, so both `npx` and `uvx` servers work.
- The Node 24 binary from `node:24.22.3-alpine3.23`. The reference MCP servers need Node 24, and the upstream image ships Node 20.
- Two default MCP servers, installed at fixed versions:
  - `@modelcontextprotocol/server-memory@2.2.1`, a knowledge graph stored in `/data/memory/memory.jsonl`;
  - `@modelcontextprotocol/server-filesystem@2.4.0`, file tools limited to `/data/files`.
- A Railway volume at `/data`, a public domain, and a health check on `/healthz` that needs no key.

## Variables

| Variable | Default | What it does |
|---|---|---|
| `SUPERGATEWAY_API_KEY` | `${{secret(32)}}` | Clients must send it as `Authorization: Bearer <key>` (or `X-API-Key`). Without it the service refuses to start. |
| `SUPERGATEWAY_CONFIG` | *(unset)* | Optional. A full Supergateway config file, as JSON or base64, that replaces the default servers. |
| `SUPERGATEWAY_LOG_LEVEL` | `info` | Optional: `debug`, `info` or `none`. |

## Connect a client

The MCP URL is `https://YOUR-DOMAIN/mcp`. Copy the key from the service's **Variables** tab. For example, for Claude Code:

```sh
claude mcp add --transport http supergateway https://YOUR-DOMAIN/mcp \
  --header "Authorization: Bearer YOUR-API-KEY"
```

Any client with a JSON config can use this:

```json
{
  "mcpServers": {
    "supergateway": {
      "type": "http",
      "url": "https://YOUR-DOMAIN/mcp",
      "headers": { "Authorization": "Bearer YOUR-API-KEY" }
    }
  }
}
```

## Use your own MCP servers

The start script reads the first config it finds:

1. the `SUPERGATEWAY_CONFIG` variable (JSON, or base64 of it);
2. `/data/supergateway.json` on the volume;
3. the template's [`default-config.json`](default-config.json).

Start from `default-config.json` and change the `mcpServers` entries. Each one is a stdio command. You can use `npx -y <package>` or `uvx <package>`. Packages are cached in `/data/.cache`, so a restart doesn't download them again. If a server needs its own secret, put it in that server's `env` block, or add it as a Railway variable on the service: every service variable is passed through to the servers.

## Memory

With the two default servers, the service uses about 70 MB at rest and about 60 MB more for each request handled at the same time. It runs on Railway's 0.5 GB plan. Each extra stdio server you add needs its own memory, and Python or browser-based servers need much more.

## Updates

The service builds from this repo. When a new Supergateway release comes out, we bump the pinned version and digest here and add an entry to [`CHANGELOG.md`](CHANGELOG.md). Railway then shows an "update available" notice on your project. Read the changelog before you apply it. Your volume, and everything on it, stays as it is.
