"use strict";
const cors = require("cors");
const helmet = require("helmet");
const express = require("express");
const HttpStatus = require("http-status-codes");
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
let index = require('./api/routes/redis/index');
let stats = require('./api/routes/redis/stats');
let player = require('./api/routes/redis/player');
let videos = require('./api/routes/redis/videos');
app.use('/', index);
app.use('/', stats);
app.use('/', player);
app.use('/', videos);
// Error handler
app.use(function (err, req, res, next) {
    if (err) {
        // Parse err
        let e;
        if (!isNaN(err)) {
            e = new Error(HttpStatus.getStatusText(err));
            e.status = err;
            err = e;
        }
        else {
            if (typeof err === 'string') {
                e = new Error(err);
                e.status = 400;
                err = e;
            }
            else {
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
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    // Permitir que el método OPTIONS funcione sin autenticación
    if ('OPTIONS' === req.method) {
        res.header('Access-Control-Max-Age', '1728000');
        res.sendStatus(200);
    }
    else {
        next();
    }
});
let server = app.listen(app.get('port'), function () {
    console.log('  Lantube server listening on port ' + server.address().port);
});
module.exports = app;
//# sourceMappingURL=app.js.map