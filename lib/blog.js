var util = require('util')
  , fs = require('fs')
  , path = require('path')
  , events = require('events')
  , watcher = require('watch-tree')
  , mongoose = require('mongoose')
  , md5 = require('MD5');

require('./post');

exports.createBlog = function(options) {
  return new Blog(options);
}

var Blog = exports.Blog = function(options) {
  options = options || {};
  this.options = {
      posts: options.posts || './posts'
    , pages: options.pages || './pages'
  };
  
  this.db = mongoose.createConnection(options.uri || 'mongodb://localhost/blog');
  this.Post = this.db.model('Post');
  
  this.filesInit('post');
  this.filesInit('page');
  
  this.postWatcher = watcher.watchTree(this.options.posts, { match: '.*\.md'});
  this.postWatcher.on('fileCreated', this.fileModified('post').bind(this));
  this.postWatcher.on('fileModified', this.fileModified('post').bind(this));
  this.postWatcher.on('fileDeleted', this.fileDeleted('post').bind(this));
  
  this.pageWatcher = watcher.watchTree(this.options.pages, { match: '.*\.md'});
  this.pageWatcher.on('fileCreated', this.fileModified('page').bind(this));
  this.pageWatcher.on('fileModified', this.fileModified('page').bind(this));
  this.pageWatcher.on('fileDeleted', this.fileDeleted('page').bind(this));
}
util.inherits(Blog, events.EventEmitter);

Blog.prototype.filesInit = function(type) {
  var self = this;
  fs.readdir(this.options[type+'s'], function(e, files) {
    files.forEach(function(filename) {
      self.fileModified(type)(self.options[type+'s'] + '/' + filename);
    });
  });
}

Blog.prototype.fileModified = function(type) {
  var self = this;
  
  return function(filename) {
    fs.readFile(filename, 'utf8', function(e, file) {
      if (e || !file) {
        return;
      }
    
      var o = {
          md: file
        , hash: md5(file)
        , type: type
        , slug: path.basename(filename, '.md')
      };
    
      self.Post.findOne({ slug: o.slug }, function(e, post) {
        if (e || (post && o.hash == post.hash)) {
          return;
        }
      
        if (!post) {
          self.Post.create(o, function(e, post) {
            self.emit(type + 'Created', post);
          });
          return;
        }
      
        post.md = o.file;
        post.save(function(e, post) {
          self.emit(type + 'Modified', post);
        });
      });
    });
  };
}

Blog.prototype.fileDeleted = function(type) {
  var self = this;
  
  return function(filename) {
    
  };
}

Blog.prototype.getPosts = function(options, fn) {
  var self = this;
  
  if (typeof options == 'function') {
    fn = options;
    options = {};
  }
  
  options = options || {};
  var options = {
      page: options.page || 1
    , per_page: options.per_page || 10
    , sort_path: options.sort_path || 'date'
    , sort_dir: options.sort_dir || -1
  };
  
  var query = self.Post.find({ type: 'post' }).sort(options.sort_path, options.sort_dir);

  if (options.per_page && options.per_page > 0) {
    query.limit(options.per_page).skip((options.page - 1) * options.per_page);
  }
  
  query.run(fn);
}

Blog.prototype.getPost = function(slug, fn) {
  this.Post.findOne({ type: 'post', slug: slug }, fn);
}

Blog.prototype.getPage = function(slug, fn) {
  this.Post.findOne({ type: 'page', slug: slug }, fn);
}

Blog.prototype.addComment = function(slug, comment, fn) {
  this.getPost(slug, function(e, post) {
    post.comments.push(comment);
    post.save(fn);
  });
}