FROM zeabur/caddy-static

COPY dist /usr/share/caddy

EXPOSE 8080
