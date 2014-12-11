package indexer

import (
	"bytes"
	"io"
	"strings"

	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

type htmlParser struct {
	title string
	b     bytes.Buffer
	z     *html.Tokenizer
}

func (p *htmlParser) parseMeta(n *html.Node) {
	indexable := false
	for _, a := range n.Attr {
		if a.Key == "name" {
			v := strings.ToLower(a.Val)
			if v == "keywords" || v == "description" {
				indexable = true
			}
		}
	}
	if !indexable {
		return
	}
	for _, a := range n.Attr {
		if a.Key == "content" {
			p.consumeString(a.Val)
		}
	}
}

func (p *htmlParser) parseImg(n *html.Node) {
	for _, a := range n.Attr {
		if a.Key == "alt" {
			p.consumeString(a.Val)
			return
		}
	}
}

func (p *htmlParser) parseTitle(n *html.Node) {
	if c := n.FirstChild; c != nil && c.Type == html.TextNode {
		p.title = c.Data
	}
}

func (p *htmlParser) consumeString(s string) {
	p.b.WriteString(s)
	p.b.WriteByte('\n')
}

func (p *htmlParser) parseNoscript(n *html.Node) {
	c := n.FirstChild
	if c == nil {
		return
	}
	nodes, err := html.ParseFragment(strings.NewReader(c.Data), nil)
	if err != nil {
		return // ignore error
	}
	for _, v := range nodes {
		p.parseNode(v)
	}
}

func (p *htmlParser) parseNode(n *html.Node) {
	switch n.Type {
	case html.DocumentNode:
		// Parse children
		if c := n.FirstChild; c != nil {
			p.parseNode(c)
		}
	case html.ElementNode:
		switch n.DataAtom {
		case atom.Title:
			p.parseTitle(n)
		case atom.Meta:
			p.parseMeta(n)
		case atom.Img:
			p.parseImg(n)
		case atom.Noscript:
			// Parse insides of noscript as HTML.
			p.parseNoscript(n)
		case atom.Script, atom.Style:
			// skip children
		default:
			// Parse children
			if c := n.FirstChild; c != nil {
				p.parseNode(c)
			}
		}
	case html.TextNode:
		p.consumeString(n.Data)
	}
	// Parse sibling.
	if c := n.NextSibling; c != nil {
		p.parseNode(c)
	}
}

func (p *htmlParser) Parse(r io.Reader) error {
	doc, err := html.Parse(r)
	if err != nil {
		return err
	}
	p.parseNode(doc)
	return nil
}

func (p *htmlParser) Content() string {
	return p.b.String()
}

func (p *htmlParser) Title() string {
	return p.title
}

func parseHTML(r io.Reader) (title, content string, err error) {
	var p htmlParser
	err = p.Parse(r)
	if err != nil {
		return
	}
	return p.Title(), p.Content(), nil
}
