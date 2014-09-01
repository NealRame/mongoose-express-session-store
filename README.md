# mongoose-express-session-store

A store engine for [express-session](https://www.npmjs.org/package/express-session)
which uses [Mongoose](https://www.npmjs.org/package/mongoose) as backend.


## Setup

```shell
~> npm install git+https://github.com/NealRame/mongoose-express-session-store.git
```


## Usage

```javascript
var Store = require('mongoose-express-session-store');

var store = new Store({
    ttl: 3600,
    uri: 'mongodb://user:pass@host:port/db'
    collection: 'sessions_collection'
});
```

See [MongooseStore#Constructor](#constructor) for more details on available
options.

See [test/app.js](https://github.com/NealRame/mongoose-express-session-store/blob/master/test/app.js)
for a concrete example of how to use `mongoose-express-session-store`.


## MongooseStore Object.


### Constructor

_Parameters_:

* `params`, _Optional_.
  A hash tat contains the following attributes:
  - `ttl`, _Optional_.

    The time to live value in seconds of a session in this store. If not
    provided, the `ttl` will be computed using the session's cookie `expires`
    or `maxAge` attributes.

  - `uri`, _Optional_.

    If given, this store will create a new connection an used that given
    `uri` to connect to the database. Otherwise it will use the default
    connection, so, in case you do not provide an `uri`, be sure that you
    have a default connection.

  - `collection`, _Optional_

    By default, this store will store sessions document in a collection
    named `sessions`. You can change the collection using that attribute.


### Methods

All methods are asynchronous and take their last arguments a callback following
the node.js completion callback pattern:
- The first argument is always reserved for an exception.
  If the operation was completed successfully, then the first argument will be
  `null` or `undefined`.
- The second parameter holds an eventual result.


#### MongooseStore#clear(callback)
Destroy all sessions.


#### MongooseStore#length(callback)
Gets the number of sessions stored.


#### MongooseStore#destroy(session_id, callback)
Destroy the session given its id.


#### MongooseStore#get(session_id, callback)
Fetch a session given its id.

#### MongooseStore#set(session_id, callback)
Creates or updates a session given its idea and data.
