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

  function titleFormat(v) {
    if (_.isFunction(v)) {
      fmt.title = v;
    } else if (_.isString(v)) {
      fmt.title = function (x) {
        return _.template(v, {title: x});
      };
    } else {
      throw 'expecting function or string';
    }
    return this;
  }

  function urlFormat(v) {
    if (_.isFunction(v)) {
      fmt.url = v;
    } else if (_.isString(v)) {
      fmt.url = function (x) {
        return _.template(v, {url: x});
      };
    } else {
      throw 'expecting function or string';
    }
    return this;
  }

  function search(query) {
    var words = _.map(_.reject(query.match(/\w{2,}/g) || [], isStopWord),
                      function (s) { return stemmer(s.toLowerCase()); });
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

  var lazySearch = _.debounce(search, 100);

  function format(results) {
    if (!results || results.length == 0) {
      return '<div class="search-status">No results found.</a>';
    }
    return _.template(
           '<div class="search-status">' +
           ' Found <%= results.length %> result<% if (results.length > 1) { print("s") } %>.' +
           '</div>' +
           '<ul><% _.each(results, function (r) { %>' +
           ' <li>' +
           '  <div class="search-result-title">' + 
           '   <a href="<%= r.url %>"><%= r.title || r.url %></a>' +
           '  </div>' +
           '  <div class="search-result-url"><%= r.url %></div>' +
           ' </li>' +
           '<% }); %> </ul>',
           {results: results, fmt: fmt});
  }

  function searchAndUpdate(query, targetElement) {
    return targetElement.innerHTML = format(search(query));
  }

  var lazySearchAndUpdate = _.debounce(searchAndUpdate, 200);

  function attach(inputElement, outputElement, noInstant) {
    if (typeof inputElement == 'string') {
      inputElement = document.querySelector(inputElement);
    }
    if (typeof outputElement == 'string') {
      outputElement = document.querySelector(outputElement);
    }
    if (!noInstant) {
      inputElement.addEventListener('keyup', function() { lazySearchAndUpdate(this.value, outputElement); });
    }
    inputElement.addEventListener('change', function() { searchAndUpdate(this.value, outputElement); });
  }

  return {
    search : search,
    lazySearch : lazySearch,
    searchAndUpdate : searchAndUpdate,
    lazySearchAndUpdate : lazySearchAndUpdate,
    init: init,
    exclude: exclude,
    attach: attach,
    urlFormat: urlFormat,
    titleFormat: titleFormat
  }

})();
