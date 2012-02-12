var mongoose = require('mongoose')
  , gravatar = require('gravatar')
  , plugins = require('./plugins')
  , utils = require('./utils');

var Comment = new mongoose.Schema({
    name      : { type: String, default: 'Anonymous' }
  , email     : { type: String }
  , md        : { type: String }
  , html      : { type: String }
  , avatar    : { type: String }
  , date      : { type: Date, default: Date }
  , meta      : { type: mongoose.Schema.Types.Mixed }
});

Comment.plugin(plugins.markdown);

Comment.path('email').set(function(v) {
  this.avatar = gravatar.url(v, { d: 'identicon' });
  return v;
})

Comment.path('html').set(function(v) {
  return utils.strip_tags(v, '<a><p><strong><em><pre><code><span>');
});

Comment.pre('save', function(next) {
  this.name = this.name || this.meta.name;
  this.email = this.email || this.meta.email;
  next();
});

module.exports = mongoose.model('Comment', Comment);
