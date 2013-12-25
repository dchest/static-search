// <SearchStatus results>
// results - array of search results.
//
var SearchStatus = React.createClass({
  render: function() {
    var r = this.props.results,
        msg;
    if (r && r.length > 0) {
      msg = 'Found ' + r.length + ' result' + (r.length > 1 ? 's' : '');
    } else {
      msg = 'No results found';
    }
    return React.DOM.div({className: 'search-status'}, msg);
  }
});

// <SearchPagination onNavigate pageNum>
// onNavigate - function called with page number to navigate to.
// pageNum - current page number.
//
var SearchPagination = React.createClass({
  render: function () {
    var that = this;
    var createItem = function(text, num) {
      return React.DOM.li({
                className : React.addons.classSet({
                  'active': (num === that.props.pageNum),
                  'disabled': (num < 1 || num > that.props.pageCount)
                })
              },
              React.DOM.a({
                href: 'javascript:;',
                onClick: function () { if (num >= 1 && num <= that.props.pageCount) { that.props.onNavigate(num) }},
              }, text));
    }
    var items = [];
    items.push(createItem('«', this.props.pageNum-1));
    for (var i = 1; i <= this.props.pageCount; i++) {
      items.push(createItem(i, i));
    }
    items.push(createItem('»', this.props.pageNum+1));
    return React.DOM.ul({className: 'pagination'}, items);
  }
});


// <SearchResults results>
// results - array of search results.
//
var SearchResults = React.createClass({
    resultsPerPage: 10,

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
      var createResult = function(res) {
        return React.DOM.li({},
                React.DOM.div({className: 'search-result-title'},
                              React.DOM.a({href: res.url}, res.title || res.url)),
                React.DOM.div({className: 'search-result-url'},
                              res.url))
      }
      var allResults = this.props.results || [];
      var pageCount = Math.ceil(allResults.length / this.resultsPerPage);
      var pageResults = allResults.slice((this.state.pageNum-1)*this.resultsPerPage,
                                         (this.state.pageNum-1)*this.resultsPerPage + this.resultsPerPage);
      return React.DOM.div({className: 'search-results'},
                           SearchStatus({results: allResults}),
                           React.DOM.ul({}, pageResults.map(createResult)),
                           pageCount < 2 ? '' : SearchPagination({
                             pageNum: this.state.pageNum,
                             pageCount: pageCount,
                             onNavigate: this.onPageNavigate
                           }));
    }
});


// <Search>
//
var Search = React.createClass({

  getInitialState: function() {
    return {query: "", results: []};
  },

  componentDidMount: function() {
    StaticSearch.init(searchIndex)
                .exclude([
                  '/404.html',
                  '/google7e5d29991a627bbc.html'
                ])
                .titleFormat(function(s) { return s.replace(/- Coding Robots$/, ''); });
  },

  onQueryChange: function(e) {
    this.setState({query: e.target.value, results : StaticSearch.search(e.target.value)});
  },

  render: function() {
    return React.DOM.div({},
             React.DOM.input({
               type: 'search',
               className: 'form-control search-query',
               value: this.state.query,
               placeholder: 'Search',
               onChange: this.onQueryChange,
             }),
             this.state.query ? SearchResults({results: this.state.results}) : ''
          )
  }

});

_.each(document.getElementsByClassName('search-component'), function (el) {
  React.renderComponent(Search({}), el);
});
