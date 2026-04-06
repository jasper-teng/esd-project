FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

EXPOSE 3006

CMD ["sh", "-c", "npx drizzle-kit push && node dist/index.js"]
