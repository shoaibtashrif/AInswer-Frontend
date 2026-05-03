# ─────────────────────────────────────────────────────────────────
#  AInswer Frontend — Static site served by nginx (alpine)
#  Build:  docker build -t ainswer-frontend .
#  Run:    docker run -d -p 8002:80 --name ainswer-frontend ainswer-frontend
#  Change port: edit the HOST port only (left side of -p 8002:80)
# ─────────────────────────────────────────────────────────────────
FROM nginx:alpine

# Remove the default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the entire project into the nginx web root
COPY . /usr/share/nginx/html

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx listens on port 80 inside the container.
# Map it to any host port you want with -p <HOST_PORT>:80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
