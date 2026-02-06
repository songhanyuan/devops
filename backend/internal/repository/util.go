package repository

import "strings"

// EscapeLike escapes special characters in a LIKE pattern to prevent
// SQL LIKE injection. Characters %, _ and \ are escaped with a backslash.
// The escaped string should be used with LIKE ... ESCAPE '\'.
func EscapeLike(keyword string) string {
	keyword = strings.ReplaceAll(keyword, `\`, `\\`)
	keyword = strings.ReplaceAll(keyword, `%`, `\%`)
	keyword = strings.ReplaceAll(keyword, `_`, `\_`)
	return keyword
}

// LikeWrap escapes and wraps keyword for a contains-style LIKE query.
func LikeWrap(keyword string) string {
	return "%" + EscapeLike(keyword) + "%"
}
