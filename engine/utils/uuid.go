package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

func generatePrefixedUUID(prefix string) string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		fmt.Printf("WARNING: crypto/rand.Read failed: %v\n", err)
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return prefix + hex.EncodeToString(b)
}

func ProjectUUID() string {
	return generatePrefixedUUID("PID")
}

func BuildUUID() string {
	return generatePrefixedUUID("BID")
}

func CaseUUID() string {
	return generatePrefixedUUID("CID")
}
