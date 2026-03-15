package utils

import (
	"fmt"
	"os"
)

func ProcessLogger(message string) {
	fmt.Printf("PID=%d | %s\n", os.Getpid(), message)
}
