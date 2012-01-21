var highlight = require('highlight').Highlight
  , marked_ = require('marked');

module.exports = function(text) {
  var tokens = marked_.lexer(text)
    , l = tokens.length
    , i = 0
    , token;

  for (; i < l; i++) {
    token = tokens[i];
    if (token.type === 'code') {
      token.text = highlight(token.text);
      token.escaped = true;
    }
  }

  text = marked_.parser(tokens);
  return text;
};