var _ = require('underscore');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var debug = require('debug')('test');
var express = require('express');
var logger = require('morgan');
var mongoose = require('mongoose');
var path = require('path');
var session = require('express-session');
var Store = require('../index');

var conn = mongoose.connect('mongodb://test:test@127.0.0.1/test').connection;

conn
    .on('connected', debug.bind(null, 'connected'))
    .on('disconnected', debug.bind(null, 'disconnected'))
    .once('open', function() {

        var app = express();

        app.use(logger('dev'));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded());
        app.use(cookieParser());
        app.use(session({
            store: new Store({
                ttl: 3600,
                // uri: 'mongodb://test:test@localhost/test',
                collection: 'mySessions'
            }),
            secret: 'plokiploki',
            proxy: true,
            resave: true,
            saveUninitialized: true
        }));

        // routes

        var template =
            _.template(
                '<!DOCTYPE html>'
                + '<html>'
                + '<body>'
                + '<p>It\'s been <% print(count ? count:0) %> time<% print(count && count > 1 ? "s":"") %> you come here.</p>'
                + '</body>'
                + '</html>'
            );
        var router = express.Router();

        router.get('/', function(req, res) {
            res.set('Content-Type', 'text/html');
            if (req.session) {
                if (_.has(req.session, 'count')) {
                    req.session.count++;
                } else {
                    req.session.count = 0;
                }
                res.send(template(req.session));
            } else {
                res.send(template({count:0}));
            }
            res.end();
        });
        app.use('/', router);
        
        // catch 404 and forward to error handler
        app.use(function(req, res, next) {
            var err = new Error('Not Found');
            err.status = 404;
            next(err);
        });

        // error handlers
        app.use(function(err, req, res, next) {
            res.status(err.status || 500);
            res.send(JSON.stringify(err));
            console.error(err.stack)
        });

        var port = process.env.PORT || 3000;
        var server = app.listen(port, function() {
          debug('Express server listening on port ' + port);
        });
    });
