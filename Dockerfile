# Build client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/abattoir.db

COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client-dist

EXPOSE 8080
VOLUME ["/data"]
CMD ["node", "server/index.js"]
