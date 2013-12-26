package indexer

import (
	"bytes"
	"testing"
)

func TestAddText(t *testing.T) {
	n := New()
	r := bytes.NewReader([]byte("HEY you! Try Mémoires.\nTry?"))
	title := "Message"
	url := "http://www.codingrobots.com"
	if err := n.AddText(url, title, r); err != nil {
		t.Fatal(err)
	}
	if len(n.Docs) == 0 {
		t.Fatalf("no documents indexed")
	}
	if n.Docs[0].Title != title || n.Docs[0].URL != url {
		t.Errorf("bad document: %v", n.Docs[0])
	}
	words := []string{"hey", "tri", "memoir"}
	for _, w := range words {
		if _, ok := n.Words[w]; !ok {
			t.Errorf("word %q not index", w)
		}
	}
}

const htmlTest = `<!doctype html>
<html>
<head>
  <title>Hello world</title>
</head>
<body>
 <div>
   <p>This is a test.</p>
 </div>
</body>
</html>`

func TestAddHTML(t *testing.T) {
	n := New()
	r := bytes.NewReader([]byte(htmlTest))
	url := "http://www.codingrobots.com"
	if err := n.AddHTML(url, r); err != nil {
		t.Fatal(err)
	}
	if len(n.Docs) == 0 {
		t.Fatalf("no documents indexed")
	}
	if n.Docs[0].Title != "Hello world" || n.Docs[0].URL != url {
		t.Errorf("bad document: %v", n.Docs[0])
	}
	words := []string{"this", "test", "hello", "world"}
	for _, w := range words {
		if _, ok := n.Words[w]; !ok {
			t.Errorf("word %q not index", w)
		}
	}
}
