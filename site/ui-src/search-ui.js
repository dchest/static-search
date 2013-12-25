/** @jsx React.DOM */
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
    return <div className='search-status'>{msg}</div>;
  }
});

// <SearchPagination onNavigate pageNum>
// onNavigate - function called with page number to navigate to.
// pageNum - current page number.
//
var SearchPagination = React.createClass({
  render: function () {
    var createItem = _.bind(function(text, num) {
      var className = React.addons.classSet({
        'active': (num === this.props.pageNum),
        'disabled': (num < 1 || num > this.props.pageCount)
      });
      var tryNavigate = _.bind(function () {
        if (num >= 1 && num <= this.props.pageCount) {
          this.props.onNavigate(num);
        }
      }, this);
      return <li className={className}>
               <a href="javascript:;" onClick={tryNavigate}>{text}</a>
             </li>
    }, this);
    var items = [];
    items.push(createItem('«', this.props.pageNum-1));
    for (var i = 1; i <= this.props.pageCount; i++) {
      items.push(createItem(i, i));
    }
    items.push(createItem('»', this.props.pageNum+1));
    return <ul className='pagination'>{items}</ul>
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
        return <li>
                 <div className='search-result-title'>
                   <a href={res.url}>{res.title || res.url}</a>
                 </div>
                 <div className='search-result-url'>
                   {res.url}
                 </div>
               </li>
      }
      var allResults = this.props.results || [];
      var pageCount = Math.ceil(allResults.length / this.resultsPerPage);
      var pageResults = allResults.slice((this.state.pageNum-1)*this.resultsPerPage,
                                         (this.state.pageNum-1)*this.resultsPerPage + this.resultsPerPage);

      var createPagination = _.bind(function() {
        if (pageCount > 1) {
          return <SearchPagination pageNum={this.state.pageNum}
                                   pageCount={pageCount}
                                   onNavigate={this.onPageNavigate} />
        }
      }, this)

      return <div className='search-results'>
               <SearchStatus results={allResults} />
               <ul>{pageResults.map(createResult)}</ul>
               {createPagination()}
             </div>
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
    var createSearchResults = _.bind(function() {
             return this.state.query ? <SearchResults results={this.state.results}> : '';
    }, this);

    return <div>
              <input type='search'
                     className='form-control search-query'
                     placeholder='Search'
                     value={this.state.query}
                     onChange={this.onQueryChange} />
               {createSearchResults()}
           </div>
  }

});

_.each(document.getElementsByClassName('search-component'), function (el) {
  React.renderComponent(Search({}), el);
});
