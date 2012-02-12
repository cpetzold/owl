var mongoose = require('mongoose')
  , marked = require('./marked');

exports.markdown = function(schema, options) {
  options = options || {};
  options = {
      md: options.md || 'md'
    , html: options.html || 'html'
    , meta: options.meta || 'meta'
  };
  
  if (!schema.path(options.md)) {
    schema.path(options.md, String);
  }
  
  if (!schema.path(options.html)) {
    schema.path(options.html, String);
  }
  
  if (!schema.path(options.meta)) {
    schema.path(options.meta, mongoose.Schema.Types.Mixed);
  }
  
  schema.path(options.md).set(function(md) {
    this[options.meta] = this[options.meta] || {};

    var match;
  	while (match = md.match(/^(.+)[^\S\n]*:[^\S\n]*([^\s].+[^\s])[^\S\n]*\n/i)) {
  		this[options.meta][match[1]] = match[2];
      md = md.substr(match[0].length);
  	}
  
    this[options.html] = marked(md);
    return md;
  });

};