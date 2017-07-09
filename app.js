'use strict';

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

// Connect to DB
require('./db/' + process.env.DB_TYPE);

// Load DB Models
require('./models/' + process.env.DB_TYPE + '/Videos');

var app = express();

var env = process.env.NODE_ENV || 'development';
app.locals.ENV = env;
app.locals.ENV_DEVELOPMENT = env == 'development';

// view engine setup

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// app.use(favicon(__dirname + '/public/img/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(__dirname + '/public/favicon.ico'));

// Redirects
// 
// Angular:
app.use('/angular-app', express.static(__dirname + '/public/js')); // My custom Angular JS
app.use('/javascripts', express.static(__dirname + '/components/angular')); // Angular main JS
app.use('/javascripts', express.static(__dirname + '/components/angular-ui-router/release')); // Angular route JS
app.use('/javascripts', express.static(__dirname + '/components/angular-animate')); // Angular route JS

// Bootstrap
app.use('/javascripts', express.static(__dirname + '/components/angular-bootstrap')); // Angular bootstrap JS

// Font Awesome (JS)
app.use('/javascripts', express.static(__dirname + '/components/angular-fontawesome/dist')); // Angular font-awesome JS
app.use('/javascripts', express.static(__dirname + '/components/event-source-polyfill')); // Angular font-awesome JS

// Font Awesome (CSS & Fonts)
app.use('/stylesheets', express.static(__dirname + '/components/font-awesome/css')); // Angular font-awesome CSS
app.use('/fonts', express.static(__dirname + '/components/font-awesome/fonts')); // Angular font-awesome CSS

var
  index = require('./routes/' + process.env.DB_TYPE + '/index'),
  stats = require('./routes/' + process.env.DB_TYPE + '/stats'),
  player = require('./routes/' + process.env.DB_TYPE + '/player'),
  videos = require('./routes/' + process.env.DB_TYPE + '/videos');

app.use('/', index);
app.use('/', stats);
app.use('/', player);
app.use('/', videos);

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('  Not Found');
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err,
      title: 'error',
      lang: 'en'
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {},
    title: 'error',
    lang: 'en'
  });
});


module.exports = app;
