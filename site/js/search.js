/*!
 * StaticSearch (c) 2013 Dmitry Chestnykh | BSD License
 * https://github.com/dchest/static-search
 */
var StaticSearch = (function() {

  var STOP_WORDS = {};
  _.each([
    "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be",
    "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't",
    "do", "does", "doesn't", "doing", "don't", "down", "for", "from",
    "further", "had", "hadn't", "has", "hasn't", "have", "haven't",
    "having", "he", "he'd", "he'll", "he's", "her", "here", "here's",
    "hers", "herself", "him", "himself", "his", "how", "how's", "i'd",
    "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
    "other", "ought", "our", "ours ", "ourselves", "out", "over", "own",
    "same", "shan't", "she", "she'd", "she'll", "she's", "should",
    "shouldn't", "so", "some", "such", "than", "that", "that's", "the",
    "their", "theirs", "them", "themselves", "then", "there", "there's",
    "these", "they", "they'd", "they'll", "they're", "they've", "this",
    "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't",
    "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't",
    "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
    "your", "yours", "yourself", "yourselves"
  ], function(w) { STOP_WORDS[w] = true; });

  function isStopWord(w) { return !!STOP_WORDS[w]; }

  var ACCENTS = {
    224 : 'a', 225 : 'a', 226 : 'a', 227 : 'a', 228 : 'a', 229 : 'a', 230 : 'a',
    231 : 'c', 232 : 'e', 233 : 'e', 234 : 'e', 235 : 'e', 236 : 'i', 237 : 'i',
    238 : 'i', 239 : 'i', 241 : 'n', 242 : 'o', 243 : 'o', 244 : 'o', 245 : 'o',
    246 : 'o', 339 : 'o', 249 : 'u', 250 : 'u', 251 : 'u', 252 : 'u', 253 : 'y',
    255 : 'y'};

  function removeAccents(w) {
    var out = '', rep;
    for (var i = 0; i < w.length; i++) {
      c = w.charCodeAt(i);
      if (c >= 768 && c <= 879) {
        continue; // skip composed accent
      }
      rep = ACCENTS[c];
      out += rep ? rep : w.charAt(i);
    }
    return out;
  }

  function makeFormatter(name, v) {
    if (!v) {
      return function(x) { return x; }
    } else if (_.isFunction(v)) {
      return v;
    } else if (_.isString(v)) {
      return function(x) {
        var data = {};
        data[name] = x;
        return _.template(v, data);
      };
    }
    throw 'expecting function or string';
  };

  var StaticSearch = function(index, options) {
    if (!index)
      throw 'Please provide a search index.';

    this._index = index;

    options || (options = {});

    this._titleFormat = makeFormatter('title', options.titleFormat);
    this._urlFormat = makeFormatter('url', options.urlFormat);

    var that = this;
    this._exclude = {};
    if (options.exclude) {
      if (_.isString(options.exclude)) {
        this._exclude[options.exclude] = true;
      } else {
        _.each(options.exclude, function(u) { that._exclude[u] = true; });
      }
    }
  };

  StaticSearch.prototype.search = function(query) {
    var that = this;
    var searchIndex = this._index;
    var queryWords = _.chain(removeAccents(query).match(/\w{1,}/g) || [])
                 .map(function(s) { return s.toLowerCase(); })
                 .value();

    var lastWord = queryWords.pop();


    var words = _.chain(queryWords)
                 .reject(isStopWord)
                 .map(stemmer)
                 .value();

     var found = _.pick(searchIndex.words, words);
     //console.log(found);


    // Consider last word in query a prefix and find the correct
    // word that matches it among all indexed words.
    if (lastWord) {
     var stemmedLastWord = stemmer(lastWord);
     _.each(searchIndex.words, function(obj, indexWord) {
       if (indexWord[0] === lastWord[0]) {
         if (indexWord.indexOf(lastWord) === 0 ||
             indexWord.indexOf(stemmedLastWord) === 0) {
           found[indexWord] = obj;
         }
       }
     });
    }

    var docs = {};
    _.each(found, function(arr) {
      _.each(arr, function(dc) {
        var d = _.isNumber(dc) ? dc : dc[0];
        docs[d] = (docs[d] || 0) + 1;
      });
    });
    //console.log(docs);

    docs = _.chain(docs)
            .pairs()
            .filter(function(p) { return p[1] >= words.length - 1; }) // allow 1 miss
            .map(function(p) { return +p[0]; })
            .value();
    //console.log(docs);

    // Rank documents by word count.
    var ranksByDoc = {};
    _.each(found, function(arr) {
      _.each(arr, function(dc) {
        var d = _.isNumber(dc) ? dc : dc[0];
        if (_.contains(docs, d)) {
          var r = _.isNumber(dc) ? 1 : dc[1];
          ranksByDoc[d] = (ranksByDoc[d] || 0) + r;
        }
      });
    });
    //console.log(ranksByDoc);

    return _.chain(ranksByDoc)
            .pairs()
            .sortBy(function(p) { return -p[1]; }) // sort by rank
            .pluck(0) // extract document number without rank
            .map(function(v) { return searchIndex.docs[v]; })
            .reject(function(v) { return that._exclude[v.u]; })
            .map(function(v) {
              return {
                title: that._titleFormat(v.t),
                url: that._urlFormat(v.u)
              };
             })
            .value();
  };

  return StaticSearch;
})();
