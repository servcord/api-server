# Automatically builds and installs a Campfire api-server.
#
# VERSION               0.0.1

FROM	 archlinux:latest

WORKDIR /app

# Update the repositories
RUN	 pacman -Syu --noconfirm

# Install nodejs-lts-fermium, npm and git
RUN	 pacman -S --noconfirm nodejs-lts-fermium npm git

# copy package.json and package-lock
COPY ["package.json", "package-lock.json", "./"]

# Copy source
COPY ./src ./src
COPY .eslintrc.js .
COPY tsconfig.json .

# Install deps
RUN  /usr/bin/npm i --also-dev

# npm won't install types(cript) in prod, so we need to set it after
ENV NODE_ENV=production

# Expose http & https port
# If you use a reverse proxy, you need to set custom ports in docker/start.sh
EXPOSE	 80
EXPOSE	 443

# Build & Start
CMD	 ["/usr/bin/npm", "start"]
