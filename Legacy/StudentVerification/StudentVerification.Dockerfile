FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build
EXPOSE 3020
ENV NODE_ENV=production
# Push schema then start server
CMD ["sh", "-c", "npx drizzle-kit push && npm start"]
