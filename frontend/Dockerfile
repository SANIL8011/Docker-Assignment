FROM alpine AS builder

WORKDIR /build

COPY index.html ./
COPY nginx.conf.template ./

FROM nginx:alpine AS runtime

RUN apk add --no-cache gettext

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /build/index.html /usr/share/nginx/html/index.html
COPY --from=builder /build/nginx.conf.template /etc/nginx/templates/nginx.conf.template

RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /etc/nginx/templates \
    && chown -R nginx:nginx /etc/nginx/conf.d \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /etc/nginx/conf.d/default.conf \
    && chown nginx:nginx /etc/nginx/conf.d/default.conf \
    && touch /run/nginx.pid \
    && chown nginx:nginx /run/nginx.pid

USER nginx

EXPOSE 80

CMD ["/bin/sh", "-c", \
  "envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]