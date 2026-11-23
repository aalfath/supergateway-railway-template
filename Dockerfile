# Supergateway 4.2.3 (uvx variant: Node + Python/uv), pinned by version and digest.
# The reference MCP servers need Node >= 24 and the upstream image ships Node 20,
# so the official Node 24 binary (same Alpine 3.23 / musl base) replaces it.
FROM node:24.22.3-alpine3.23@sha256:3946fb783fdce8a2812136ea694bc95c698c4f4096f3fd18568dc27a8ac389dc AS node24

FROM supercorp/supergateway:4.2.3-uvx@sha256:050f1dfe8ff9fa7535e0557313a100d2da7d1731ed571cfaba6cc54fce3de234

COPY --from=node24 /usr/local/bin/node /usr/local/bin/node

# The default MCP servers, installed at fixed versions so a restart never downloads anything.
RUN npm install -g --no-audit --no-fund \
      @modelcontextprotocol/server-filesystem@2.4.0 \
      @modelcontextprotocol/server-memory@2.2.1 \
    && npm cache clean --force \
    && node --version && supergateway --version

COPY default-config.json /app/default-config.json
COPY start.sh limiter.mjs /app/
RUN chmod 755 /app/start.sh

ENV NODE_ENV=production \
    UV_CACHE_DIR=/data/.cache/uv \
    npm_config_cache=/data/.cache/npm

EXPOSE 8000
ENTRYPOINT ["/app/start.sh"]
