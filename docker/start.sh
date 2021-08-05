#! /bin/sh
docker run -d --net campfire-network -p 8443:443 -p 8877:80 --name campfire-api-server campfire/api-server