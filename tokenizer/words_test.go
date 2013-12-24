package tokenizer

import "testing"

type tokenizerTest struct {
	text   string
	tokens []string
}

var goldenWords = []tokenizerTest{
	{
		"Hello world",
		[]string{"Hello", "world"},
	},
	{
		"I, Tokenizer. I extract: words, sentences, and other things. Right?",
		[]string{"I", "Tokenizer", "I", "extract", "words", "sentences", "and", "other", "things", "Right"},
	},
}

func testTokenizer(t *testing.T, makeTokenizer func(string) Tokenizer, tests []tokenizerTest) {
	for i, v := range tests {
		tk := makeTokenizer(v.text)
		j := 0
		for tk.Next() {
			if j > len(v.tokens) {
				t.Errorf("%d: extracted extra token (%d): %q", i, j, tk.Token())
			} else if tk.Token() != v.tokens[j] {
				t.Errorf("%d: bad token %d. Expected %q, got %q", i, j, v.tokens[j], tk.Token())
			}
			j++
		}
		if j < len(v.tokens) {
			t.Errorf("%d: missed tokens: %v", v.tokens[j:])
		}
	}
}

func TestWords(t *testing.T) {
	testTokenizer(t, func(s string) Tokenizer { return Words(s) }, goldenWords)
}
