package migrations

import "strings"

func isDuplicateColumnError(err string) bool {
	return strings.Contains(err, "duplicate column name")
}
