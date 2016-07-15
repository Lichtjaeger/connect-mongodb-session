# koa-mongodb-session

[MongoDB](http://mongodb.com)-backed session storage for [koa](http://koajs.com/) and it's [koa-generic-session](https://github.com/koajs/generic-session) module. Meant to be a well-maintained and fully-featured replacement for modules like [koa-generic-session-mongo](https://github.com/pavelvlasov/koa-generic-session-mongo)

# API

## MongoDBStore

This module exports a `MongoDBStore` class that can be used to
store sessions in MongoDB.

The MongoDBStore class has 2 required options:

1. `uri`: a [MongoDB connection string](http://docs.mongodb.org/manual/reference/connection-string/)
2. `collection`: the MongoDB collection to store sessions in

**Note:** You can pass a callback to the `MongoDBStore` constructor,
but this is entirely optional. The module will manage the internal connection state for you.

```javascript

    const Koa = require('koa');
    const session = require('koa-generic-session');
    const convert = require('koa-convert');
    const MongoDBStore = require('koa-mongodb-session');

    const app = new Koa();
    const store = new MongoDBStore(
      {
        uri: 'mongodb://localhost:27017/connect_mongodb_session_test',
        collection: 'mySessions'
      });

    // Catch errors
    store.on('error', function(error) {
      assert.ifError(error);
      assert.ok(false);
    });

    app.keys = ['This is a secret']

    app.use(convert(session({
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
      },
      store
    })))

    app.use(ctx => {
      ctx.body = `Hello ${JSON.stringify(ctx.session)}`;
    });

    app.listen(3000);

```

#### It throws an error when it can't connect to MongoDB

You should pass a callback to the `MongoDBStore` constructor to catch
errors. If you don't pass a callback to the `MongoDBStore` constructor,
`MongoDBStore` will `throw` if it can't connect.

```javascript

    const Koa = require('koa');
    const session = require('koa-generic-session');
    const convert = require('koa-convert');
    const MongoDBStore = require('koa-mongodb-session');

    const app = new Koa();
    const store = new MongoDBStore(
      {
        uri: 'mongodb://bad.host:27000/connect_mongodb_session_test?connectTimeoutMS=10',
        collection: 'mySessions'
      },
      function(error) {
        // Should have gotten an error
      });

    store.on('error', function(error) {
      // Also get an error here
    });

    app.keys = ['This is a secret']

    app.use(convert(session({
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
      },
      store
    })))

    app.use(ctx => {
      ctx.body = `Hello ${JSON.stringify(ctx.session)}`;
    });

    app.listen(3000);

```

