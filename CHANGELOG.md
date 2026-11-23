# Changelog

## 4.2.3 (2026-11-23)

- First release of the template: Supergateway 4.2.3 (`4.2.3-uvx` image, pinned by digest) on Node 24.22.3, serving `@modelcontextprotocol/server-memory@2.2.1` and `@modelcontextprotocol/server-filesystem@2.4.0` at `/mcp` (Streamable HTTP), with an API key, a `/healthz` check and data on the `/data` volume. A small front on `$PORT` caps concurrent MCP requests by the memory limit (4 at 0.5 GB) and queues the rest.
