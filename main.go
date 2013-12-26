// Copyright 2013 Dmitry Chestnykh. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Program to index HTML files, generating JSON output.
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path"
	"path/filepath"
	"time"

	"github.com/dchest/static-search/indexer"
)

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
	index := indexer.New()
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
		err = index.AddHTML(url, f)
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
	err = index.WriteJSON(f)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Indexed %d documents in %s.\n", n, time.Now().Sub(t))
}
