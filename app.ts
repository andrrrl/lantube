import * as cors from 'cors';
import * as helmet from 'helmet';
import * as express from 'express';
import * as bodyParser from 'body-parser'
import * as HttpStatus from 'http-status-codes';
// import * as socketio from 'socket.io';
import * as ServerSchema from './api/schemas/redis/Server';
import * as redis from './api/connections/redis';
import { Player } from './api/controllers/redis/player';

import { createServer } from "http";
import { Server } from "socket.io";



// Load Server
const lantubeServer = new ServerSchema.Server();

require('dotenv').config({
    path: '.env'
});

let app = express();

app.set('port', 3000);

// Tell express to use the body-parser middleware and to not parse extended bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(helmet());
app.options('*', cors());

let env = 'development';
app.locals.ENV = env;
app.locals.ENV_DEVELOPMENT = env === 'development';

let server = app.listen(app.get('port'), async () => {
    console.log('  Lantube server listening on port ' + app.get('port'));
    if (cors) {
        console.info('   > CORS enabled!');
    }
    let stats = await lantubeServer.getPlayerStats();
    stats.status = 'stopped';
    await lantubeServer.setPlayerStats(stats);
});


const io = new Server(server, {
    cors: {
        origin: ["http://192.168.4.36:8100", "http://localhost:8100" ],
        // allowedHeaders: ["my-custom-header"],
        // credentials: true
      }
    });

server.on('listening', () => {

    io.on('connection', async (socket) => {
        socket.removeAllListeners();
        console.log('Listeners desconectados.');
        
        console.log('Listener conectado.');
        socket.emit('SERVER_MESSAGE', { signal: 'connected' });
        const stats = await lantubeServer.getPlayerStats();
        socket.emit('PLAYER_MESSAGE', stats);
    });

    io.on('disconnect', () => {
        io.sockets.removeAllListeners();
        console.log('Listeners desconectados.');
    });

    io.on('CLIENT_MESSAGE', (client) => {
        if (client.message === 'disconnectAll') {
            io.sockets.removeAllListeners();
        }
    });

    process.on('SIGINT', () => {
        console.log('\nGracefully shutting down from SIGINT (Ctrl-C)');

        const PlayerCtrl = new Player(io);
        PlayerCtrl.stopAll();

        console.log('Disconnecting sockets');
        io.sockets.removeAllListeners();
        console.log('Disconnecting redis');
        redis.removeAllListeners();

        process.exit(1);
    });
});

// const index = require('./api/routes/redis/index');
// const stats = require('./api/routes/redis/stats');
const player = require('./api/routes/redis/player');
const youtube = require('./api/routes/redis/youtube');
const media = require('./api/routes/local/media');
// const dht = require('./api/routes/sensor/dht'); // requiere sudo
// const fc28 = require('./api/routes/sensor/fc-28');
// const lcd = require('./api/routes/lcd/lcd');
// const cam = require('./api/routes/cam/cam');
// const ds18b20 = require('./api/routes/sensor/ds18b20');
const coreTemp = require('./api/routes/sensor/coreTemp');
// const relay = require('./api/routes/relay/relay');
const browser = require('./api/routes/browser/browser');


// app.use('/', index);
// app.use('/', stats);
app.use('/', player(io));
app.use('/', youtube(io));
app.use('/', media(io));
// app.use('/', dht(io));
// app.use('/', fc28(io));
// app.use('/', lcd(io));
// app.use('/', cam(io));
// app.use('/', ds18b20(io));
app.use('/', coreTemp(io));
// app.use('/', relay());
app.use('/', browser(io));

// Error handler
app.use((err: any, req, res, next) => {
    if (err) {
        // Parse err
        let e: Error;
        if (!isNaN(err)) {
            e = new Error(HttpStatus.getStatusText(err));
            (e as any).status = err;
            err = e;
        } else {
            if (typeof err === 'string') {
                e = new Error(err);
                (e as any).status = 400;
                err = e;
            } else {
                err.status = 500;
            }
        }

        // IMPORTANTE: Express app.get('env') returns 'development' if NODE_ENV is not defined.
        // O sea, la API está corriendo siempre en modo development

        // Send response
        res.status(err.status);
        res.send({
            message: err.message,
            error: (app.get('env') === 'development') ? err : null
        });
    }
});

app.all('*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Permitir que el método OPTIONS funcione sin autenticación
    if ('OPTIONS' === req.method) {
        res.header('Access-Control-Max-Age', '1728000');
        res.sendStatus(200);
    } else {
        console.log(req.body);
        next();
    }
});


export = app;
