# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# # Stage 2: Production
# FROM node:20-alpine

# WORKDIR /app

# RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# # Copy compiled code and dependency manifests
# COPY --from=build /app/dist ./dist
# COPY --from=build /app/package.json /app/package-lock.json ./

# # Install all dependencies only
# RUN npm ci

# RUN chown -R appuser:appgroup /app
# USER appuser

# ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "run", "dev"]