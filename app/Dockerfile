# https://dev.to/jacobsamro/building-a-minimalist-docker-images-with-node-typescript-and-pnpm-109j
FROM node:20.16.0-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY package.json pnpm-lock.yaml /app/
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . /app
RUN pnpm run build


FROM gcr.io/distroless/nodejs20-debian11

COPY --from=prod-deps /app/package.json /app/package.json
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/out /app/out

WORKDIR /app


# Solana sdk wants ESM, but loading json in node is experimental
ENV NODE_OPTIONS="--no-warnings=ExperimentalWarning"
CMD [ "out/liquidator.js"]