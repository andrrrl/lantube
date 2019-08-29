import * as cors from 'cors';
import * as helmet from 'helmet';
import * as express from 'express';
import * as bodyParser from 'body-parser'
import * as HttpStatus from 'http-status-codes';
import * as socketio from 'socket.io';
import * as ServerSchema from './api/schemas/redis/Server';

// Load Server
let Server = new ServerSchema.Server();

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

var env = 'development';
app.locals.ENV = env;
app.locals.ENV_DEVELOPMENT = env === 'development';

let server = app.listen(app.get('port'), async () => {
    console.log('  Lantube server listening on port ' + app.get('port'));
    if (cors) {
        console.info('   > CORS enabled!');
    }
    let stats = await Server.getPlayerStats();
    stats.status = 'stopped';
    await Server.setPlayerStats(stats);
});

let io = socketio(server);

server.on('listening', () => {
    io.on('connection', async (socket) => {
        console.log("Cliente conectado.");

        socket.removeAllListeners();

        socket.emit('SERVER_MESSAGE', { signal: 'connected' });

        let stats = await Server.getPlayerStats();

        socket.emit('PLAYER_MESSAGE', stats);

    });
});

let index = require('./api/routes/redis/index');
let stats = require('./api/routes/redis/stats');
let player = require('./api/routes/redis/player');
let videos = require('./api/routes/redis/videos');
let dht = require('./api/routes/sensor/dht');

// app.use('/', index);
// app.use('/', stats);
app.use('/', player(io));
app.use('/', videos(io));
app.use('/', dht(io));

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
