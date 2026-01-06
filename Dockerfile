# Build client
FROM node:20-alpine AS client-build
WORKDIR /build/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Runtime
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/abattoir.db

COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./
COPY --from=client-build /build/client/dist ./public

EXPOSE 8080
VOLUME ["/data"]
CMD ["node", "index.js"]
