var util = require('util');
var mongodb = require('mongodb');
var EventEmitter = require('events').EventEmitter;
var Promise = require('promise-es6').Promise;

var defaults = {
  uri: 'mongodb://localhost:27017/test',
  collection: 'sessions',
  connectionOptions: {},
  expires: 1000 * 60 * 60 * 24 * 14, // 2 weeks
  idField: '_id'
};

function MongoDBStore(options) {
  EventEmitter.call(this);

  var _this = this;
  this._errorHandler = handleError.bind(this);

  if (typeof options === 'function') {
    callback = options;
    options = {};
  } else {
    options = options || {};
  }

  mergeOptions(options, defaults);

  this.options = options;

  var connOptions = options.connectionOptions;
  mongodb.MongoClient.connect(options.uri, connOptions, function(error, db) {
    if (error) {
      var e = new Error('Error connecting to db: ' + error.message);
      return _this._errorHandler(e);
    }

    db.
      collection(options.collection).
      ensureIndex({ expires: 1 }, { expireAfterSeconds: 0 }, function(error) {
        if (error) {
          var e = new Error('Error creating index: ' + error.message);
          return _this._errorHandler(e);
        }

        _this.db = db;
        _this.emit('connect');
      });
  });
};

util.inherits(MongoDBStore, EventEmitter);

MongoDBStore.prototype._generateQuery = function(id) {
  var ret = {};
  ret[this.options.idField] = id;
  return ret;
};

MongoDBStore.prototype.get = function(id) {
  var _this = this;
  return (new Promise(function(resolve) {
    if (_this.db) {
      return resolve()
    }
    _this.once('connect', function() {
      resolve();
    });
  })).then(function() {
    return new Promise(function(resolve, reject) {
      _this.db.collection(_this.options.collection).
        findOne(_this._generateQuery(id), function(error, session) {
          if (error) {
            var e = new Error('Error finding ' + id + ': ' + error.message);
            return _this._errorHandler(e, reject);
          } else if (session) {
            if (!session.expires || new Date < session.expires) {
              return resolve(session.session);
            } else {
              return resolve(_this.destroy(id));
            }
          } else {
            return resolve();
          }
        });
    });
  });
};

MongoDBStore.prototype.destroy = function(id) {
  var _this = this;
  return (new Promise(function(resolve) {
    if (_this.db) {
      resolve()
    }
    _this.once('connect', function() {
      resolve();
    });
  })).then(function() {
    return new Promise(function(resolve, reject) {
      _this.db.collection(_this.options.collection).
        remove(_this._generateQuery(id), function(error) {
          if (error) {
            var e = new Error('Error destroying ' + id + ': ' + error.message);
            return _this._errorHandler(e, reject);
          }
          resolve();
        });
    });
  });
};

MongoDBStore.prototype.set = function(id, session) {
  var _this = this;
  return (new Promise(function(resolve) {
    if (_this.db) {
      resolve()
    }
    _this.once('connect', function() {
      resolve();
    });
  })).then(function() {
    return new Promise(function(resolve, reject) {
      var sess = {};
      for (var key in session) {
        if (key === 'cookie') {
          sess[key] = session[key].toJSON ? session[key].toJSON() : session[key];
        } else {
          sess[key] = session[key];
        }
      }

      var s = _this._generateQuery(id);
      s.session = sess;
      if (session && session.cookie && session.cookie.expires) {
        s.expires = new Date(session.cookie.expires);
      } else {
        var now = new Date();
        s.expires = new Date(now.getTime() + _this.options.expires);
      }

      _this.db.collection(_this.options.collection).
        update(_this._generateQuery(id), s, { upsert: true }, function(error) {
          if (error) {
            var e = new Error('Error setting ' + id + ' to ' +
              util.inspect(session) + ': ' + error.message);
            return _this._errorHandler(e, reject);
          }
          resolve();
        });
    });
  });
};

function handleError(error, callback) {
  if (this.listeners('error').length) {
    this.emit('error', error);
  }

  if (callback) {
    callback(error);
  }

  if (!this.listeners('error').length && !callback) {
    throw error;
  }
}

function mergeOptions(options, defaults) {
  for (var key in defaults) {
    options[key] = options[key] || defaults[key];
  }
}

module.exports = MongoDBStore;
