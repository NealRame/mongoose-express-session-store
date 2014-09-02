// mongoosestore.js
// ================
// - author: Neal.Rame. <contact@nealrame.com>
// -   date: Sun Aug 31 22:03:57 CEST 2014
//
var _ = require('underscore');
var debug = require('debug')('mongoosestore');
var mongoose = require('mongoose');
var Store = require('express-session').Store;
var url = require('url');
var util = require('util');

///
/// ## `MongooseStore` Object.
///
///
/// ### Constructor
///
/// _Parameters_:
///
/// * `params`, _Optional_.
///   A hash tat contains the folowing attributes:
///   - `ttl`, _Optional_.
///
///     The time to live value in seconds of a session in this store. If not
///     provided, the `ttl` will be computed using the session's cookie
///     `expires` or `maxAge` attributes.
///
///   - `uri`, _Optional_.
///
///     If given, this store will create a new connection an used that given
///     `uri` to connect to the database. Otherwise it will use the default
///     connection, so, in case you do not provide an `uri`, be sure that you
///     have a default connection.
///
///   - `collection`, _Optional_
///
///     By default, this store will store sessions document in a collection
///     named `sessions`. You can change the collection using that attribute.
function MongooseStore(params) {
    Store.call(this, options);

    var options = params || {};

    var Promise = mongoose.Promise;
    var Schema = mongoose.Schema;

    var connection, uri;

    if (options.uri) {
        connection = mongoose.createConnection();
        uri =options.uri;
    } else {
        connection = mongoose.connection;

        var uri_obj = {
            protocol: 'mongodb',
            slashes: true,
            pathname: connection.name,
            hostname: connection.host,
            port: connection.port,
        };

        if (connection.user) {
            uri_obj.auth = connection.user;
            if (connection.pass) {
                uri_obj.auth = uri_obj.auth + ':' + connection.pass;
            }
        }

        uri = url.format(uri_obj);
    }

    var ttl = options.ttl || 0;

    this.connectAndExec_ = function connect_and_exec(shots, task) {
        var promise = new Promise;

        if (connection.readyState === 1) {
            try {
                task.call(this, promise);
            } catch (err) {
                promise.error(err);
            }
        } else if (shots > 0) {
            connection.open(uri, (function(err) {
                if (err) {
                    debug(err);
                    promise.error(err);
                } else {
                    debug('connected to db');
                    connect_and_exec.call(this, shots - 1, task)
                        .then(
                            promise.fulfill.bind(promise),
                            promise.error.bind(promise)
                        );
                }
            }).bind(this));
        } else {
            promise.error(new Error('Failed to connect to database'));
        }

        return promise;
    };

    this.expiry_ = function(cookie) {
        if (ttl > 0) {
            return new Date(Date.now() + ttl*1000);
        }
        if (cookie) {
            if (cookie.expires) {
                return cookie.expires;
            }
            if (cookie.maxAge) {
                return new Date(Date.now() + cookie.maxAge);
            }
        }
        return null;
    };

    this.model = mongoose.model(
        'Session',
        new mongoose.Schema({
            data: Schema.Types.Mixed,
            _expireAt: {type: Date, expires: 0},
            _id: {type: String, unique: true}
        }),
        options.collection
    );
};

util.inherits(MongooseStore, Store);


/// ### Methods
///
/// All methods are asynchronous and take their last arguments a callback
/// following the node.js completion callback pattern:
/// - The first argument is always reserved for an exception.
///   If the operation was completed successfully, then the first
///   argument will be `null` or `undefined`.
/// - The second parameter holds an eventual result.
///
/// #### MongooseStore#clear(callback)
/// Destroy all sessions.
MongooseStore.prototype.clear = function(cb) {
    this.connectAndExec_(1, function(promise) {
        this.model.remove({}).exec()
            .then(
                promise.fulfill.bind(promise),
                promise.error.bind(promise)
            );
    }).onResolve(cb);
};

/// #### MongooseStore#length(callback)
/// Gets the number of sessions stored.
MongooseStore.prototype.length = function(cb) {
    this.connectAndExec_(1, function(promise) {
        this.model.count({}).exec()
            .then(
                promise.fulfill.bind(promise),
                promise.error.bind(promise)
            )
    }).onResolve(cb);
};

/// #### MongooseStore#destroy(session_id, callback)
/// Destroy the session given its id.
MongooseStore.prototype.destroy = function(sid, cb) {
    this.connectAndExec_(1, function(promise) {
        this.model.remove({
            _id: sid
        }).exec()
            .then(promise.fulfill.bind(promise))
            .then(null, promise.error.bind(promise));
    }).onResolve(cb);
};

/// #### MongooseStore#get(session_id, callback)
/// Fetch a session given its id.
MongooseStore.prototype.get = function(sid, cb) {
    this.connectAndExec_(1, function(promise) {
        this.model.findOne({_id: sid}).exec()
            .then(
                function(item) { promise.fulfill(item ? item.data : null); },
                promise.error.bind(promise)
            );
    }).onResolve(cb);
};

/// #### MongooseStore#set(session_id, callback)
/// Creates or updates a session given its idea and data.
MongooseStore.prototype.set = function(sid, session, cb) {
    if (! session) {
        return destroy(sid, cb);
    }

    this.connectAndExec_(1, function(promise) {
        this.model.update(
            {_id: sid},
            {data: session, _expiryAt: this.expiry_(session.cookie), _id: sid},
            {upsert: true}
        ).exec()
            .then(
                promise.fulfill.bind(promise),
                promise.error.bind(promise)
            );
    }).onResolve(cb);
};

module.exports = MongooseStore;
