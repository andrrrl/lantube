# MEAN youtube video player from LAN, just for fun! #

### Installation ###
* clone this repo and:
```
$ npm install && bower install
```

### Config (optional): ###
* Rename `.env_example` file to `.env` in the root directory
* Lantube can work without `.env` file, but some config is likely to be needed
* Default config has following options:

```
# Config

# Nodejs server port, default 3000
NODE_PORT=3000

# Mongo DB
MONGO_USER=admin
MONGO_DB=lantube
MONGO_COLL=videos

# Player
PLAYER=mpv

# TODO: support player options, like:

# Force player to start video from begining
# PLAYER_OPTION_START=--start:00

# Force start in fullscreen
# PLAYER_OPTION_FS=--fs
```

### Requirements: ###
* (probably) latest youtube-dl `sudo pip install youtube-dl -U`
* Media player like mplayer, mpv, vlc, etc

### Usage: ###

Just do:
```
 $ gulp 
```
It will run tasks like sass, uglify and start node server with nodemon.

* Local: navigate to http://localhost:3000 in any modern browser
* LAN: get your server's IP number and navigate to http://YOUR_SERVER_IP:3000 from any modern browser