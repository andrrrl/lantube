# Lantube: MEAN youtube video player from LAN, just for fun! #
* Lantube's main idea is to play videos with a media center computer, like a [Raspberry Pi](https://www.raspberrypi.org/), with some config; or maybe with an old computer.
* Use of Lantube over the Internet is possible but not recommended at all.

### Requirements and Notices: ###
* Lantube is tested only on Debian-based systems.
* This installation works out of the box if [Node.js](https://nodejs.org/) and [MongoDB](https://www.mongodb.com/) are installed (and running).
* Requires a media player like mplayer, mpv, vlc, etc. to work. If no player is set (or if `.env` file is missing), it will try to use mpv.

### Installation ###
* Clone this repo with: 
```
$ git clone https://github.com/andrrrl/lantube
```
* Install Lantube:
```
$ npm install
```
* Will auto-run `bower install` too
* Also will run `node ./tools/install.js`, a tiny tool that creates a default `.env` file (see below)

### Default config (.env_example file): ###

```
# Server host name
HOST_NAME=hostname
# Nodejs server port, default 3000
NODE_PORT=3000

# [DEV] MongoDB Connection
MONGO_HOST=localhost
MONGO_PORT=
MONGO_DB=lantube
MONGO_AUTH=no
MONGO_USER=admin
MONGO_PASS

# [PROD] MongoDB Connection
# MONGO_HOST=example.com
# MONGO_PORT=27001
# MONGO_DB=lantube
# MONGO_AUTH=yes
# MONGO_USER=admin
# MONGO_PASS=shhhh

# MongoDB Collections
MONGO_VIDEOS_COLL=videos
MONGO_STATS_COLL=serverStats

# Player
PLAYER=mpv
```

### Usage: ###

Just run of following commands:

#### Livereload mode (default, better for dev): ####
```
 $ gulp 
```
It will run tasks like sass, uglify and start node server with [nodemon](http://nodemon.io/) + [livereload](http://livereload.com/).

#### Non-livereload mode (better for user experience): ####
```
$ gulp lantube
```
It will also run sass, uglify and start node server with [nodemon](http://nodemon.io/).

### Use it7: ###
* Local: Navigate to http://localhost:3000 in any modern browser
* LAN: Get your server's IP number and navigate to http://YOUR_SERVER_IP:3000 from any modern browser

### Security: ###
* Lantube is limited to LAN, any external IP will not be allowed.
* Lantube is just for fun, don't rely too much on it for serious matters.

### TODOs: ###
- Not the idea to use outside LAN, but still:
* Add Mongo auth?
* API auth? 