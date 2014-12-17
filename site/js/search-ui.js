/** @jsx React.DOM */
/*!
 * StaticSearch (c) 2013 Dmitry Chestnykh | BSD License
 * https://github.com/dchest/static-search
 */

// <SearchStatus count>
// count - number of found results
//
var SearchStatus = React.createClass({displayName: 'SearchStatus',
  render: function() {
    var plural = function(s, c) {
      return c == 1 ? s : s + 's';
    };
    var msg;
    if (this.props.count > 0) {
      msg = 'Found ' + this.props.count + plural(' result', this.props.count);
    } else {
      msg = 'No results found';
    }
    return React.createElement("div", {className: "search-status"}, msg);
  }
});

// <SearchPagination onNavigate pageNum pageCount>
// onNavigate - function called with page number to navigate to.
// pageNum - current page number.
// pageCount - total number of pages.
//
var SearchPagination = React.createClass({displayName: 'SearchPagination',
  render: function () {
    var props = this.props;
    var createItem = function(text, num) {
      var classes = React.addons.classSet({
        'active': (num === props.pageNum),
        'disabled': (num < 1 || num > props.pageCount)
      });
      var handleNavigate = function () {
        if (num >= 1 && num <= props.pageCount) {
          props.onNavigate(num);
        }
      };
      return (
        React.createElement("li", {className: classes}, 
          React.createElement("a", {href: "javascript:;", onClick: handleNavigate}, text)
        )
      );
    };
    var items = [];
    items.push(createItem('«', props.pageNum-1));
    for (var i = 1; i <= this.props.pageCount; i++) {
      items.push(createItem(i, i));
    }
    items.push(createItem('»', props.pageNum+1));
    return React.createElement("ul", {className: "pagination"}, items);
  }
});


// <SearchResult title url>
// title - result title.
// url - result URL.
//
var SearchResult = React.createClass({displayName: 'SearchResult',
  render: function() {
    return (
      React.createElement("li", null, 
        React.createElement("div", {className: "search-result-title"}, 
          React.createElement("a", {href: this.props.url}, this.props.title || this.props.url)
        ), 
        React.createElement("div", {className: "search-result-url"}, 
          this.props.url
        )
      )
    );
  }
});

// <SearchResults results resultsPerPage>
// results - array of search results.
// resultsPerPage - how many results per page to show.
//
var SearchResults = React.createClass({displayName: 'SearchResults',
    getInitialState: function() {
      return { pageNum: 1 };
    },

    onPageNavigate : function(n) {
      this.setState({ pageNum: n });
    },

    componentWillReceiveProps: function(nextProps) {
      this.setState({ pageNum: 1 });
    },

    render: function() {
      var results = this.props.results || [];
      var pageCount = Math.ceil(results.length / this.props.resultsPerPage);
      var offset = (this.state.pageNum-1) * this.props.resultsPerPage;

      var pageOfResults = _.map(
        results.slice(offset, offset + this.props.resultsPerPage),
        function(res) {
          return React.createElement(SearchResult, {title: res.title, url: res.url});
        }
      );

      var pagination = null;
      if (pageCount > 1) {
        pagination = (
          React.createElement(SearchPagination, {
            pageNum: this.state.pageNum, 
            pageCount: pageCount, 
            onNavigate: this.onPageNavigate}
          )
        );
      }

      return (
        React.createElement("div", {className: "search-results"}, 
          React.createElement(SearchStatus, {count: results.length}), 
          React.createElement("ul", null, pageOfResults), 
          pagination
        )
      );
    }
});


// <Search searcher resultsPerPage>
// searcher - instance of StaticSearch.
// resultsPerPage - how many search results per page to show.
//
var Search = React.createClass({displayName: 'Search',

  getInitialState: function() {
    return {query: '', results: []};
  },

  onQueryChange: function(e) {
    this.setState({
      query: e.target.value,
      results : this.props.searcher.search(e.target.value)
    });
  },

  render: function() {
    var searchResults = null;
    if (this.state.query) {
       searchResults = (
         React.createElement(SearchResults, {
           results: this.state.results, 
           resultsPerPage: this.props.resultsPerPage}
         )
       );
    }
    return (
      React.createElement("div", null, 
        React.createElement("input", {
          type: "search", 
          className: "form-control search-query", 
          placeholder: "Search", 
          value: this.state.query, 
          onChange: this.onQueryChange}
        ), 
        searchResults
      )
    );
  }

});

function StaticSearchUI(elementOrQuery, searcher, resultsPerPage) {
  var elements;
  if (_.isString(elementOrQuery)) {
    elements = document.querySelectorAll(elementOrQuery);
  } else {
    elements = [ element ];
  }
  _.each(elements, function(e) {
    React.render(Search({
      searcher: searcher,
      resultsPerPage: resultsPerPage || 10
    }), e);
  });
}
