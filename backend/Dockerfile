FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 5 && \
    npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 5 && \
    npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
