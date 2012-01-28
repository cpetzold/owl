var mongoose = require('mongoose')
  , marked = require('./marked')
  , gravatar = require('gravatar');

var Comment = new mongoose.Schema({
    name      : String
  , email     : String
  , body      : String
  , avatar    : String
  , date      : { type: Date, default: Date }
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
  , comments  : [ Comment ]
});

Comment.pre('save', function(next) {
  this.avatar = gravatar.url(this.email || '');
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
  
  next();
});

module.exports = mongoose.model('Post', Post);