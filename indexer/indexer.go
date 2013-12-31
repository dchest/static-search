package indexer

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"

	"github.com/dchest/stemmer/porter2"

	"github.com/dchest/static-search/indexer/tokenizer"
)

type Index struct {
	Docs  []*Document              `json:"docs"`
	Words map[string][]interface{} `json:"words"`

	HTMLTitleWeight        int `json:"-"`
	HTMLURLComponentWeight int `json:"-"`
}

type Document struct {
	URL   string `json:"u"`
	Title string `json:"t"`
}

func New() *Index {
	return &Index{
		Docs:                   make([]*Document, 0),
		Words:                  make(map[string][]interface{}),
		HTMLTitleWeight:        3,
		HTMLURLComponentWeight: 10,
	}
}

func (n *Index) WriteJSON(w io.Writer) error {
	return json.NewEncoder(w).Encode(n)
}

func (n *Index) addWord(word string, doc, weight int) {
	if weight == 1 {
		n.Words[word] = append(n.Words[word], doc)
	} else {
		n.Words[word] = append(n.Words[word], [2]int{doc, weight})
	}
}

func (n *Index) newDocument(url, title string) int {
	n.Docs = append(n.Docs, &Document{URL: url, Title: title})
	return len(n.Docs) - 1
}

func (n *Index) addString(doc int, text string, wordWeight int) {
	wordcnt := make(map[string]int)
	tk := tokenizer.Words(text)
	for tk.Next() {
		w := tk.Token()
		if len(w) < 2 || isStopWord(w) {
			continue
		}
		wordcnt[porter2.Stemmer.Stem(removeAccents(w))] += wordWeight
	}
	for w, c := range wordcnt {
		n.addWord(w, doc, c)
	}
}

func (n *Index) AddText(url, title string, r io.Reader) error {
	var b bytes.Buffer
	if _, err := io.Copy(&b, r); err != nil {
		return err
	}
	n.addString(n.newDocument(url, title), b.String(), 1)
	return nil
}

func (n *Index) AddHTML(url string, r io.Reader) error {
	title, content, err := parseHTML(r)
	if err != nil {
		return err
	}
	doc := n.newDocument(url, title)
	n.addString(doc, title, n.HTMLTitleWeight)
	n.addString(doc, content, 1)
	// Add URL components.
	url = strings.TrimPrefix(url, "http://")
	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "www.")
	// The farther the component, the less its weight.
	// Also, each components weight depends on the total number of them, so
	// that "blog" in /blog/ weights more than in /blog/some-post/.
	components := strings.Split(url, "/")
	weight := n.HTMLURLComponentWeight / len(components)
	for _, v := range components {
		weight /= 2
		if weight < 1 {
			weight = 1
		}
		n.addString(doc, v, weight)
	}
	return nil
}
