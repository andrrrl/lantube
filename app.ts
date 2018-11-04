import * as cors from 'cors';
import * as helmet from 'helmet';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as socketio from 'socket.io';

require('dotenv').config({
    path: '.env'
});

let app = express();

app.set('port', 3000);
app.use(cors());
app.use(helmet());
app.options('*', cors());

var env = 'development';
app.locals.ENV = env;
app.locals.ENV_DEVELOPMENT = env === 'development';

let server = app.listen(app.get('port'), () => {
    console.log('  Lantube server listening on port ' + app.get('port'));
    if (cors) {
        console.info('   > CORS enabled!');
    }
});

let io = socketio(server);
server.on('listening', () => {

    io.on('connection', (socket) => {
        console.log("SOCKET SERVER CONNECTION");
        socket.emit('USER_MESSAGE', { signal: 'connected' });
    });
    // io.emit('USER_MESSAGE', { signal: 'ready' });
});

let index = require('./api/routes/redis/index');
let stats = require('./api/routes/redis/stats');
let player = require('./api/routes/redis/player');
let videos = require('./api/routes/redis/videos');

// app.use('/', index);
// app.use('/', stats);
app.use('/', player(io));
app.use('/', videos(io));

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
        next();
    }
});

export = app;
