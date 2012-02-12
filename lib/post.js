var mongoose = require('mongoose')
  , gravatar = require('gravatar')
  , Comment = require('./comment')
  , plugins = require('./plugins');

var Post = new mongoose.Schema({
    title     : { type: String }
  , slug      : { type: String, unique: true }
  , type      : { type: String, index: true, default: 'post' }
  , md        : { type: String }
  , html      : { type: String }
  , hash      : { type: String }
  , date      : { type: Date }
  , meta      : { type: mongoose.Schema.Types.Mixed }
  , tags      : { type: [ String ], index: true }
  , comments  : { type: [ Comment ] }
});

Post.index({ type: 1, slug: 1 });
Post.index({ type: 1, date: 1 });
Post.index({ type: 1, tags: 1 });
Post.index({ type: 1, date: 1, tags: 1 });

Post.plugin(plugins.markdown);

Post.pre('save', function(next) {
  this.title = this.meta.title || this.title || (this.slug[0].toUpperCase() + this.slug.substring(1).replace('-', ' '));
  this.date = new Date(this.meta.date) || this.date;
  this.tags = this.meta.tags ? this.meta.tags.split(/\s*,\s*/) : this.tags;
  next();
})

module.exports = mongoose.model('Post', Post);