package indexer

import "testing"

var good = []string{
	"you",
	"we",
	"yours",
}

var bad = []string{
	"apple",
	"golang",
	"wrong",
}

func TestIsStopWord(t *testing.T) {
	for i, s := range good {
		if !isStopWord(s) {
			t.Errorf("%d: %q not considered as stop word", i, s)
		}
	}
	for i, s := range bad {
		if isStopWord(s) {
			t.Errorf("%d: %q considered as stop word", i, s)
		}
	}
}
