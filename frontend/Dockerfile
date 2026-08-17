# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

# Accept build argument for API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (use --no-frozen-lockfile for CI compatibility)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Debug: Show environment
RUN echo "=== ENVIRONMENT ===" && printenv | grep VITE

# Build Vite app
RUN pnpm run build

# Debug: List build output
RUN echo "=== BUILD OUTPUT ===" && ls -la /app/dist/ && echo "=== DIST INDEX.HTML ===" && head -10 /app/dist/index.html

# Run stage (Nginx)
FROM nginx:stable-alpine AS runner
WORKDIR /usr/share/nginx/html

# Remove default static assets
RUN rm -rf ./*

# Copy build output
COPY --from=builder /app/dist .

# Debug: Verify copied files
RUN echo "=== COPIED FILES ===" && ls -la . && echo "=== INDEX.HTML CONTENT ===" && head -5 index.html

# Copy nginx template to enable envsubst of ${PORT}
RUN mkdir -p /etc/nginx/templates
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY nginx-main.conf /etc/nginx/nginx.conf

# Debug: Show nginx template
RUN echo "=== NGINX TEMPLATE ===" && cat /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
