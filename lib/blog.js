var util = require('util')
  , fs = require('fs')
  , path = require('path')
  , events = require('events')
  , async = require('async')
  , watch = require('watch')
  , mongoose = require('mongoose') 
  , md5 = require('MD5');

require('./post');

var Blog = module.exports = function(options) {
  events.EventEmitter.call(this);
  
  options = options || {};
  this.options = {
      posts: options.posts || './posts'
    , pages: options.pages || './pages'
    , mongo: options.mongo || 'mongodb://localhost/blog'
    , mdext: options.mdext || '.md'
    , debug: options.debug || false
  };
  this._log(this.options);

  this.db = mongoose.createConnection(this.options.mongo);
  this.Post = this.db.model('Post');
};
util.inherits(Blog, events.EventEmitter);

Blog.prototype.set = function(k, v) {
  return v ? (this.options[k] = v) : this.options[k];
};

Blog.prototype.init = function(fn) {
  var self = this
    , types = ['posts', 'pages'];

  this.monitor = {};
  async.forEach(types, function(type, cb) {
    self.monitor[type] = watch.createMonitor(self.options[type], {
      filter: function(filename) {
        return path.extname(filename) != self.options.mdext;
      }
    }, function(monitor) {
      type = type.substring(0, type.length - 1);
      // self._log('monitered files', Object.keys(monitor.files));
      monitor.on('created', self._modified(type).bind(self));
      monitor.on('changed', self._modified(type).bind(self));
      monitor.on('removed', self._deleted(type).bind(self));
      cb();
    });
  }, function(e) {
    async.forEach(types, self.update.bind(self), function(e) {
      self.emit('init', e);
      self._log('init', e || 'successful');
      fn && fn(e);
    });
  });
};

Blog.prototype.update = function(type, fn) {
  var self = this;
  fs.readdir(this.options[type], function(e, files) {
    if (e || !files) return fn && fn(e);
    async.forEach(files, function(filename, cb) {
      self._modified(type.replace(/s$/, ''))(self.options[type] + '/' + filename, cb);
    }, function(e) {
      if (e) return fn && fn(e);
      self.emit(type + '.updated');
      self._log(type + '.updated');
      fn && fn();
    });
  });
};

Blog.prototype.posts = function(options, fn) {
  var self = this;
  
  if (typeof options == 'function') {
    fn = options;
    options = {};
  }
  
  options = options || {};
  options.page = options.page || 1;
  options.per_page = options.per_page || 10;
  options.sort_path = options.sort_path || 'date';
  options.sort_dir = (options.sort_dir == 'asc') ? 1 : -1;
  options.query = options.query || { type: 'post' };
  
  if (options.tag) {
    options.query.tags = options.tag;
  } else if (options.tags) {
    options.query.tags = { $all: options.tags };
  }
  
  var query = self.Post.find(options.query).sort(options.sort_path, options.sort_dir);

  if (options.per_page && options.per_page > 0) {
    query.limit(options.per_page).skip((options.page - 1) * options.per_page);
  }
  
  query.run(fn);
};

Blog.prototype.post = function(slug, fn) {
  this.Post.findOne({ type: 'post', slug: slug }, fn);
};

Blog.prototype.page = function(slug, fn) {
  this.Post.findOne({ type: 'page', slug: slug }, fn);
};

Blog.prototype.comment = function(slug, comment, fn) {
  var self = this;
  this.post(slug, function(e, post) {
    if (e) return fn && fn(e);
    post.comments.push(comment);
    post.save(function(e, post) {
      if (e) return fn && fn(e);
      fn && fn(null, comment, post);
      self.emit('comment.added', comment, post);
    });
  });
};

Blog.prototype._modified = function(type) {
  var self = this;
  
  return function(filename, fn) {
    fn = ('function' == typeof fn) ? fn : false;
    
    self._log(type, 'updated:', filename);

    fs.readFile(filename, 'utf8', function(e, file) {
      if (e || !file) {
        return fn && fn(e || new Error('Unable to find '+ type + ' \'' + filename + '\''));
      }
    
      var o = {
          md: file
        , hash: md5(file)
        , type: type
        , slug: path.basename(filename, self.options.mdext)
      };

      // self._log(o);
      
      self.Post.findOne({ slug: o.slug }, function(e, post) {
        if (e || (post && o.hash == post.hash)) {
          return fn && fn(e);
        }
      
        if (!post) {
          self.Post.create(o, function(e, post) {
            self.emit(type + '.created', post);
            fn && fn();
          });
        } else {
          Object.keys(o).forEach(function(p) {
            post[p] = o[p];
          });
          
          post.save(function(e, post) {
            self.emit(type + '.modified', post);
            fn && fn();
          });
        }
      });
    });
  };
};

Blog.prototype._deleted = function(type) {
  var self = this;
  
  return function(filename, fn) {
    self._log(type, 'deleted:', filename);
    self.Post.remove({ slug: path.basename(filename, self.options.mdext) }, fn);
  };
};

Blog.prototype._log = function() {
  if (this.options.debug) {
    console.log.apply(null, arguments);
  }
};