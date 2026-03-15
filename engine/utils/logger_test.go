package utils

import (
	"bytes"
	"fmt"
	"os"
	"strings"
	"testing"
)

func TestProcessLogger(t *testing.T) {
	oldStdout := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	ProcessLogger("test message")

	w.Close()
	os.Stdout = oldStdout

	var buf bytes.Buffer
	buf.ReadFrom(r)
	output := buf.String()

	expectedPrefix := fmt.Sprintf("PID=%d | ", os.Getpid())
	if !strings.HasPrefix(output, expectedPrefix) {
		t.Errorf("expected output to start with %q, got %q", expectedPrefix, output)
	}
	if !strings.Contains(output, "test message") {
		t.Errorf("expected output to contain 'test message', got %q", output)
	}
}
