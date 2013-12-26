package indexer

func init() {
	accentsMap = make(map[rune]rune)
	for _, v := range accents {
		for _, r := range v.runes {
			accentsMap[r] = v.rep
		}
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

var accentsMap map[rune]rune // will be filled on init

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
