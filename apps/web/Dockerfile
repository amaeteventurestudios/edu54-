# Web app: static build served by Caddy, with /api proxied to the API. Built from the repo root:
#   docker build -f apps/web/Dockerfile -t umanah/web:0.1.0 .
FROM node:26-alpine AS build
WORKDIR /w
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web ./
ARG VITE_PRODUCT_NAME="Umanah AI Lab"
ENV VITE_PRODUCT_NAME=$VITE_PRODUCT_NAME
RUN npm run build

FROM caddy:2.11.4-alpine
COPY --from=build /w/dist /srv/web
COPY infrastructure/compose/Caddyfile /etc/caddy/Caddyfile
