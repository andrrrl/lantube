# Lantube: MEAN youtube video player from LAN, just for fun! #
* Lantube's main idea is to play videos with a media center computer, like a [Raspberry Pi](https://www.raspberrypi.org/), with some config; or maybe with an old computer.
* Use of Lantube over the Internet is possible but not recommended at all.

### Requirements and Notices: ###
* Lantube is tested only on Debian-based systems.
* This installation works out of the box if [Node.js](https://nodejs.org/) and [MongoDB](https://www.mongodb.com/) are installed (and running).
* Requires a media player like mplayer, mpv, vlc, etc. to work. If no player is set (or if `.env` file is missing), it will try to use mpv.

### Installation ###
* Clone this repo with `$ git clone https://github.com/andrrrl/lantube` and:
* If any requirements are missing, look at the error logs, traces, etc.
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

### Usage: ###

Just do:
```
 $ gulp 
```
It will run tasks like sass, uglify and start node server with nodemon.

Finally:
* Local: Navigate to http://localhost:3000 in any modern browser
* LAN: Get your server's IP number and navigate to http://YOUR_SERVER_IP:3000 from any modern browser

### Security: ###
* Lantube is limited to LAN, any external IP will not be allowed.
* Lantube is just for fun, don't rely too much on it for serious matters.

### TO-DOs: ### 
* Add Mongo auth?
* API auth? 