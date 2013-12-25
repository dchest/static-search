StaticSearch = (function() {

  var searchIndex,
      excludedURLs = [],
      fmt = {
        title : function(x) { return x },
        url : function(x) { return x }
      };

      var stopWords = {};
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
      ], function (w) { stopWords[w] = true; });

  function isStopWord(w) { return !!stopWords[w]; }

  function init(index) {
    searchIndex = index;
    return this;
  }

  function exclude(urls) {
    if (typeof urls === 'string') urls = [ urls ];
    _.each(urls, function (u) { excludedURLs[u] = true; });
    return this;
  }

  function makeFormatter(name, v) {
    if (_.isFunction(v)) {
      fmt[name] = v;
    } else if (_.isString(v)) {
      fmt[name] = function (x) {
        var data = {};
        data[name] = x;
        return _.template(v, data);
      };
    } else {
      throw 'expecting function or string';
    }
  }

  function titleFormat(v) {
    makeFormatter('title', v);
    return this;
  }

  function urlFormat(v) {
    makeFormatter('url', v);
    return this;
  }

  function search(query) {
    var words = _.chain(query.match(/\w{2,}/g) || [])
                 .map(function (s) { return s.toLowerCase(); })
                 .reject(isStopWord)
                 .map(stemmer)
                 .value();
    //console.log("Searching for", words);

    var found = _.pick(searchIndex.words, words);
    //console.log(found);

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
            .map(function (p) { return +p[0]; })
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
            .reject(function (v) { return excludedURLs[v.url] })
            .map(function (v) { return {title: fmt.title(v.title), url: fmt.url(v.url)}; })
            .value();
  }

  return {
    init: init,
    exclude: exclude,
    urlFormat: urlFormat,
    titleFormat: titleFormat,
    search : search
  }

})();
