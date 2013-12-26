package indexer

import "testing"

func TestRemoveAccents(t *testing.T) {
	before := "Mémoires"
	after := "Memoires"
	if removeAccents(before) != after {
		t.Errorf("failed to remove accents: expected %s, got %s", after, removeAccents(before))
	}
}
