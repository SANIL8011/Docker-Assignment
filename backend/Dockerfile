FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

FROM node:18-alpine AS runtime


RUN apk add --no-cache netcat-openbsd

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

COPY app.js ./
COPY wait-for-mysql.sh ./

RUN chmod +x wait-for-mysql.sh

RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["./wait-for-mysql.sh"]