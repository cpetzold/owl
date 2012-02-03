var mongoose = require('mongoose')
  , marked = require('./marked')
  , utils = require('./utils')
  , gravatar = require('gravatar');

var Comment = new mongoose.Schema({
    name      : String
  , email     : String
  , md        : String
  , html      : String
  , avatar    : String
  , date      : { type: Date, default: Date }
  , meta      : mongoose.Schema.Types.Mixed
});

var Post = new mongoose.Schema({
    title     : String
  , slug      : String
  , type      : { type: String, default: 'post' }
  , md        : String
  , html      : String
  , hash      : String
  , date      : { type: Date, default: Date }
  , meta      : mongoose.Schema.Types.Mixed
  , tags      : [ String ]
  , comments  : [ Comment ]
});

Comment.pre('save', function(next) {
  this.meta = this.meta || {};

  var match;
	while (match = this.md.match(/^([a-z]+):\s*(.*)\s*\n/i)) {
		this.meta[match[1]] = match[2];
    this.md = this.md.substr(match[0].length);
	}
  
  this.html = utils.strip_tags(marked(this.md || ''), '<a><p><strong><em><pre><code><span>');
  
  this.name = this.meta.name || 'Anonymous';
  
  if (this.meta.email) {
    this.email = this.meta.email;
  }
  this.avatar = gravatar.url(this.email || '', { d: 'identicon' });
  
  next();
});

Post.pre('save', function(next) {
  if (this.isModified('comments')) {
    return next();
  }
  
  this.meta = this.meta || {};

  var match;
	while (match = this.md.match(/^([a-z]+):\s*(.*)\s*\n/i)) {
		this.meta[match[1]] = match[2];
    this.md = this.md.substr(match[0].length);
	}
  
  this.html = marked(this.md);
  this.title = this.meta.title || (this.slug[0].toUpperCase() + this.slug.substring(1).replace('-', ' '));
  
  if (this.meta.date) {
    this.date = new Date(this.meta.date);
  }
  
  if (this.meta.tags) {
    this.tags = this.meta.tags.split(/\s*,\s*/);
  }
  
  next();
});

module.exports = mongoose.model('Post', Post);