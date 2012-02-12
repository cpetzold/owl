var mongoose = require('mongoose')
  , gravatar = require('gravatar')
  , plugins = require('./plugins')
  , utils = require('./utils');

var Comment = module.exports = new mongoose.Schema({
    name      : { type: String }
  , email     : { type: String }
  , md        : { type: String }
  , html      : { type: String }
  , avatar    : { type: String }
  , date      : { type: Date, default: Date }
  , meta      : { type: mongoose.Schema.Types.Mixed }
});

Comment.plugin(plugins.markdown);

Comment.path('html').set(function(v) {
  return utils.strip_tags(v, '<a><p><strong><em><pre><code><span>');
});

Comment.pre('save', function(next) {
  this.name = this.name || (this.meta && this.meta.name) || 'Anonymous';
  this.email = this.email || (this.meta && this.meta.email) || '';
  this.avatar = gravatar.url(this.email, { d: 'identicon' });
  next();
});