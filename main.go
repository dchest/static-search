// Copyright 2013 Dmitry Chestnykh. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Program to index HTML files, generating JSON output.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"code.google.com/p/go.net/html"
	"github.com/dchest/stemmer/porter2"

	"github.com/dchest/static-search/tokenizer"
)

type Doc struct {
	URL   string `json:"url"`
	Title string `json:"title"`
}

var documents = make([]*Doc, 0)

// Index maps stemmed word to [doc, count] or just doc if count is 1.
var index = make(map[string][]interface{})

var (
	stopWords  = make(map[string]interface{})
	accentsMap = make(map[rune]rune)
)

func init() {
	// Stop words map.
	var present interface{}
	for _, v := range stopWordList {
		stopWords[v] = present
	}
	// Accents map.
	for _, v := range accents {
		for _, r := range v.runes {
			accentsMap[r] = v.rep
		}
	}
}

func isStopWord(w string) bool {
	_, ok := stopWords[w]
	return ok
}

func addWord(word string, doc, count int) {
	if count == 1 {
		index[word] = append(index[word], doc)
	} else {
		index[word] = append(index[word], [2]int{doc, count})
	}
}

func removeAccents(s string) string {
	runes := []rune(s)
	for i, c := range runes {
		if c >= 768 && c <= 879 {
			continue // skip composed accent
		}
		rep, ok := accentsMap[c]
		if ok {
			runes[i] = rep
		}
	}
	return string(runes)
}

func extractHTMLText(r io.Reader) (text string, title string, err error) {
	var b bytes.Buffer
	z := html.NewTokenizer(r)
	skipTag := func(tag string) bool {
		if tag == "script" || tag == "style" {
			return true
		}
		return false
	}
	skipped := 0
	inTitle := false
	for {
		switch z.Next() {
		case html.ErrorToken:
			err := z.Err()
			if err == io.EOF {
				return b.String(), title, nil
			}
			return "", title, err
		case html.StartTagToken, html.SelfClosingTagToken:
			tag, _ := z.TagName()
			stag := string(tag)
			if skipTag(stag) {
				skipped++
			}
			if stag == "title" {
				inTitle = true
			}
		case html.EndTagToken:
			tag, _ := z.TagName()
			if skipTag(string(tag)) {
				skipped--
			}
		case html.TextToken:
			if inTitle && title == "" {
				title = strings.TrimSpace(string(z.Raw()))
			}
			if skipped == 0 {
				b.Write(z.Raw())
				b.WriteString("\n")
			}
		}
	}
}

func indexHTMLDoc(name string, r io.Reader) error {
	text, title, err := extractHTMLText(r)
	if err != nil {
		return err
	}
	// Add document.
	documents = append(documents, &Doc{URL: name, Title: title})
	doc := len(documents) - 1
	// Add words to index.
	wordcnt := make(map[string]int)
	tk := tokenizer.Words(text)
	for tk.Next() {
		w := tk.Token()
		if len(w) < 2 || isStopWord(w) {
			continue
		}
		wordcnt[porter2.Stemmer.Stem(removeAccents(w))]++
	}
	// Add words from title with more weight.
	tk = tokenizer.Words(title)
	for tk.Next() {
		w := tk.Token()
		if len(w) < 2 || isStopWord(w) {
			continue
		}
		wordcnt[porter2.Stemmer.Stem(removeAccents(w))] += 10
	}
	for w, n := range wordcnt {
		addWord(w, doc, n)
	}
	return nil
}

func writeIndex(w io.Writer) error {
	return json.NewEncoder(w).Encode(struct {
		Docs  []*Doc                   `json:"docs"`
		Words map[string][]interface{} `json:"words"`
	}{
		documents,
		index,
	})
}

var (
	fDir = flag.String("d", "", "root directory with documents")
	fOut = flag.String("o", "search-index.json", "output file")
	fVar = flag.String("var", "", "(optional) JavaScript variable to assign index object to")
)

func isHTMLExt(ext string) bool {
	return ext == ".html" || ext == ".htm"
}

func cleanDocURL(s string) string {
	// Strip index filename.
	if path.Base(s) == "index.html" || path.Base(s) == "index.htm" {
		s = s[:len(s)-len(path.Base(s))]
	}
	// Make sure it starts with /.
	if len(s) > 0 && s[0] != '/' {
		s = "/" + s
	}
	return s
}

func main() {
	flag.Parse()
	if *fDir == "" {
		flag.Usage()
		return
	}
	t := time.Now()
	n := 0
	dir := filepath.Clean(*fDir)
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		if !isHTMLExt(filepath.Ext(path)) {
			return nil
		}
		f, err := os.Open(path)
		if err != nil {
			return err
		}
		url := cleanDocURL(filepath.ToSlash(path[len(dir):]))
		err = indexHTMLDoc(url, f)
		f.Close()
		if err != nil {
			return err
		}
		fmt.Println(url)
		n++
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
	f, err := os.Create(*fOut)
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	if n == 0 {
		fmt.Println("No documents indexed.")
		return
	}
	if *fVar != "" {
		if _, err := fmt.Fprintf(f, "%s = ", *fVar); err != nil {
			log.Fatal(err)
		}
	}
	err = writeIndex(f)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Indexed %d documents in %s.\n", n, time.Now().Sub(t))
}

var stopWordList = []string{
	"all",
	"am",
	"an",
	"and",
	"any",
	"are",
	"aren't",
	"as",
	"at",
	"be",
	"because",
	"been",
	"before",
	"being",
	"below",
	"between",
	"both",
	"but",
	"by",
	"can't",
	"cannot",
	"could",
	"couldn't",
	"did",
	"didn't",
	"do",
	"does",
	"doesn't",
	"doing",
	"don't",
	"down",
	"for",
	"from",
	"further",
	"had",
	"hadn't",
	"has",
	"hasn't",
	"have",
	"haven't",
	"having",
	"he",
	"he'd",
	"he'll",
	"he's",
	"her",
	"here",
	"here's",
	"hers",
	"herself",
	"him",
	"himself",
	"his",
	"how",
	"how's",
	"i'd",
	"i'll",
	"i'm",
	"i've",
	"if",
	"in",
	"into",
	"is",
	"isn't",
	"it",
	"it's",
	"its",
	"itself",
	"let's",
	"me",
	"more",
	"most",
	"mustn't",
	"my",
	"myself",
	"no",
	"nor",
	"not",
	"of",
	"off",
	"on",
	"once",
	"only",
	"or",
	"other",
	"ought",
	"our",
	"ours ",
	"ourselves",
	"out",
	"over",
	"own",
	"same",
	"shan't",
	"she",
	"she'd",
	"she'll",
	"she's",
	"should",
	"shouldn't",
	"so",
	"some",
	"such",
	"than",
	"that",
	"that's",
	"the",
	"their",
	"theirs",
	"them",
	"themselves",
	"then",
	"there",
	"there's",
	"these",
	"they",
	"they'd",
	"they'll",
	"they're",
	"they've",
	"this",
	"those",
	"through",
	"to",
	"too",
	"under",
	"until",
	"up",
	"very",
	"was",
	"wasn't",
	"we",
	"we'd",
	"we'll",
	"we're",
	"we've",
	"were",
	"weren't",
	"what",
	"what's",
	"when",
	"when's",
	"where",
	"where's",
	"which",
	"while",
	"who",
	"who's",
	"whom",
	"why",
	"why's",
	"with",
	"won't",
	"would",
	"wouldn't",
	"you",
	"you'd",
	"you'll",
	"you're",
	"you've",
	"your",
	"yours",
	"yourself",
	"yourselves",
}

var accents = []struct {
	runes []rune
	rep   rune
}{
	{[]rune{'à', 'á', 'â', 'ã', 'ä', 'å'}, 'a'},
	{[]rune{'æ'}, 'a'}, // ae, but we need one rune
	{[]rune{'ç'}, 'c'},
	{[]rune{'è', 'é', 'ê', 'ë'}, 'e'},
	{[]rune{'ì', 'í', 'î', 'ï'}, 'i'},
	{[]rune{'ñ'}, 'n'},
	{[]rune{'ò', 'ó', 'ô', 'õ', 'ö'}, 'o'},
	{[]rune{'œ'}, 'o'}, // oe, but we need one rune
	{[]rune{'ù', 'ú', 'û', 'ü'}, 'u'},
	{[]rune{'ý', 'ÿ'}, 'y'},
}
