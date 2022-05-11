# Description

Espheron charges by filesize and uploads the project on Arweave, however, due to Arweave "permaweb" nature, files are never deleted or changed. Instead, every deplot is done completely and the user just redirects the DNS.

The biggest and more expensive part of a software uploaded on arweabe are it's assets, so this program was made to upload the assets separatedly from the main project while the main projects just reference them internally.

This code is inside the landing page project and should be used there.

# Working

This bot connects to a arweabe node (or testeweave in dev), uploads the assets there and saves the address with a md5 hash (to detect file changes) in a json file.

The file is later uploaded into the main project and the addresses are used im image/video tags instead of uploading the assets with the project

# Architecture

Due to its simplicity, this project was made as a Nodejs script.

# Current State

I'm not sure if this version works. The latest version is already inside the CyberForest landing page project and the last changes were made there.

# Instructions

## Start local Tesweave node:

clone testweave-docker to run a testweave on your machine:

`git clone https://github.com/ArweaveTeam/testweave-docker.git`

enter testweave-docker root:

`cd testweave-docker`

run testweave-docker with docker compose:

`docker-compose up`

check if the node is up by accesing `localhost:1984/info` on the browser

## Install project

enter project root

`cd core-image-upload`

install project dependencies

`npm install`

## Add images

enter project root

`cd core-image-upload`

copy your image to assets folder

`cp <image_path> assets`

## Run project in dev mode

run the project with `dev` as parameter

`node upload.js dev`

all images that are not in `assets_map.dev.json` will be added 

their name will be the key 

their address will be the value

## Run project in prod mode

run the project with `prod` and `wallet.json` path as parameter

`node upload.js prod <wallet_path>`

all images that are not in `assets_map.prod.json` will be added 

their name will be the key

their address will be the value

**it is important to commit the project after running in producton to avoid repeated uploads**

## Stop local Testweave node:

enter testweave-docker root:

`cd testweave-docker`

stop testweave-docker with docker-compose:

`docker-compose down`
