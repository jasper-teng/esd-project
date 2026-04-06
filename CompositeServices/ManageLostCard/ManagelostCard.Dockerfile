FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev
COPY . .
EXPOSE 4007
CMD ["npm", "start"]