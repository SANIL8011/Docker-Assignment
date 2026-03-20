FROM node:18-alpine

RUN apk add --no-cache netcat-openbsd

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY app.js ./
COPY wait-for-mysql.sh ./

RUN chmod +x wait-for-mysql.sh

EXPOSE 3000

CMD ["./wait-for-mysql.sh"]
