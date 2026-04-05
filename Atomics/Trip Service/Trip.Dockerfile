FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
ENV NODE_ENV=development
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3005

CMD ["node", "dist/index.js"]
