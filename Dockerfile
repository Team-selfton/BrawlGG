FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY . .

EXPOSE 3000

CMD ["node", "apps/server/src/index.js"]
