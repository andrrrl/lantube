# Play youtube videos from LAN, just for fun #

### Installation ###
* clone this repo and:
```
$ npm install
$ bower install
```

### Config (optional): ###
* Create a .env file in the root directory with following options:

```
# Config

# Nodejs server, default 3000
NODE_PORT=3000

# Mongo DB
MONGO_USER=admin
MONGO_DB=lantube
MONGO_COLL=videos

# Player
PLAYER=mpv

#TODO: PLAYER_OPTIONS=--start:00
```

### Requirements: ###
* Latest youtube-dl `sudo pip install youtube-dl -U`
* Media player like mplayer, mpv, vlc, etc

### Usage: ###

Just do:
```
 $ gulp 
```
Local: navigate to http://localhost:3000 in any modern browser
LAN: get your server's IP number and navigate to http://YOUR_SERVER_IP:3000 from any modern browser