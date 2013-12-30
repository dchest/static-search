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
	ensureIndexContains(t, n, []string{"hey", "tri", "memoir"})
}

const htmlTest = `<!doctype html>
<html>
<script>alert(1)</script>
<head>
  <title>Hello world</title>
  <meta name="description" content="offspring">
  <meta name="keywords" content="green day, yoohie">
</head>
<body>
 <div>
   <img src="/some/image.png" alt="masterpiece">
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
	ensureIndexContains(t, n, []string{
		"this",
		"test",
		"hello",
		"world",
		"offspr",
		"green",
		"day",
		"yoohi",
		"masterpiec",
	})
}

func ensureIndexContains(t *testing.T, n *Index, words []string) {
	for _, w := range words {
		if _, ok := n.Words[w]; !ok {
			t.Errorf("word %q not index", w)
		}
	}
	wordsMap := mapFromStrings(words)
	for w := range n.Words {
		if _, ok := wordsMap[w]; !ok {
			t.Errorf("extra word %q in index", w)
		}
	}
}

func mapFromStrings(a []string) map[string]bool {
	m := make(map[string]bool, len(a))
	for _, v := range a {
		m[v] = true
	}
	return m
}
