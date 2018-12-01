# Lantube: #
## Youtube video player from LAN ##
* Converts any computer into a Youtube video player, controlled from a browser or command line tools (optional, requires Python, cURL and/or SSH)
* Uses local media player software, like OMXPLAYER (tested, default), MPV and VLC (not all features working)
* Runs as a service in a media center computer, like a [Raspberry Pi](https://www.raspberrypi.org/), with very few configs
* Users in the same LAN area can add and play (and stop) any Youtube video
* Use of Lantube in untrusted LANs or over the Internet is possible but **not recommended** at all
* Supports Chromecast (tested with Googlecast) with [castnow](https://github.com/xat/castnow) 

### Requirements and Notices: ###
* Lantube is tested only on Debian-based systems
* This installation works out of the box if [Node.js](https://nodejs.org/) and [REDIS](https://redis.io/) or [MongoDB](https://www.mongodb.com/) are installed (and running)
* Requires a local media player like OMXPLAYER (Raspberry Pi only), MPV, VLC, etc. to work. If no player is set (or if `.env` file is missing), it will try to use MPV as default player
* If your player fails to play Youtube streams, you can search for answers online for your particular case, as players, systems and distros can have different configurations
* DB connection can be a remote MongoDB, like [mLab](https://mlab.com/), AWS Cloud, [Openshift](https://www.openshift.com/) (only DB service)
* Chromecast dongle [optional]

### Supported players ###
* MPV
* VLC (fails? see [Updating the VLC YouTube parser](http://askubuntu.com/a/197766/280008))
* OMXPLAYER (Raspberry Pi)
* Chromecast with [castnow](https://github.com/xat/castnow)

### Installation ###
* Clone this repo with: 
```
$ git clone https://github.com/andrrrl/lantube
```
* Install Lantube:
```
$ npm install
```
* Will auto-run `npm install`
* Also will run `node ./tools/install.js`, a tiny tool that creates a default `.env` file (see below)

### Server: ###

Just run one of the following commands:

#### Livereload mode (default, better for dev): ####
```
 $ npm start 
```
It will transpile typescript to javascript and serve [nodemon](http://nodemon.io/)

### Client (Browser): ###
* Use project [lantube-mobile](https://github.com/andrrrl/lantube-mobile), which runs in http://localhost:8100 in any modern browser
* LAN: Get your server's IP number and navigate to http://YOUR_SERVER_IP:3000 from any modern browser

### Client (CLI): ###
* *WIP* Python CLI (full featured):
  1. `$ cd cli/python`
  2. `$ python lantube-cli.py help`
* *WIP* Node.js CLI (for quick tests): 
  1. `$ cd cli/node/`
  2. `$ node lantube-cli.js help`

### Security: ###
* Use it only on trusted LAN networks
* Lantube is limited to LAN, any external IP will not be allowed
* Lantube is just for fun, don't rely too much on it for serious matters

### TODOs: ###
* [x] Volume controls (Where compatible)
* [ ] Firefox/Chromium extension (?)
* [ ] API auth with passport (?)
* [ ] Make it work use outside LAN (?)
* [ ] Googlecast support
