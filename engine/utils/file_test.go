package utils

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestToCaseName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"login.latest.png", "login.png"},
		{"login.baseline.png", "login.png"},
		{"/path/to/login.12345678.diff.png", "login.png"},
		{"header-content.latest.png", "header-content.png"},
	}

	for _, tc := range tests {
		result := ToCaseName(tc.input)
		if result != tc.expected {
			t.Errorf("ToCaseName(%q) = %q, want %q", tc.input, result, tc.expected)
		}
	}
}

func TestToCaseBaseName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"login.latest.png", "login"},
		{"login.baseline.png", "login"},
		{"header-content.latest.png", "header-content"},
	}

	for _, tc := range tests {
		result := ToCaseBaseName(tc.input)
		if result != tc.expected {
			t.Errorf("ToCaseBaseName(%q) = %q, want %q", tc.input, result, tc.expected)
		}
	}
}

func TestToDiffFilename(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"/path/to/login.latest.png", "/path/to/login.diff.png"},
		{"/path/to/header-content.latest.png", "/path/to/header-content.diff.png"},
	}

	for _, tc := range tests {
		result := ToDiffFilename(tc.input)
		if result != tc.expected {
			t.Errorf("ToDiffFilename(%q) = %q, want %q", tc.input, result, tc.expected)
		}
	}
}

func TestToDiffFileWithPercentage(t *testing.T) {
	tests := []struct {
		filename   string
		percentage float64
		expected   string
	}{
		{"login.diff.png", 0.12345678, "login.12345678.diff.png"},
		{"login.diff.png", 0.0, "login.0.diff.png"},
		{"header-content.diff.png", 0.45, "header-content.45000000.diff.png"},
	}

	for _, tc := range tests {
		result := ToDiffFileWithPercentage(tc.filename, tc.percentage)
		if result != tc.expected {
			t.Errorf("ToDiffFileWithPercentage(%q, %f) = %q, want %q",
				tc.filename, tc.percentage, result, tc.expected)
		}
	}
}

func TestPercentageFromDiffFile(t *testing.T) {
	tests := []struct {
		input    string
		expected float64
	}{
		{"login.12345678.diff.png", 0.12345678},
		{"login.0.diff.png", 0.0},
		{"login.45000000.diff.png", 0.45},
	}

	for _, tc := range tests {
		result := PercentageFromDiffFile(tc.input)
		if result != tc.expected {
			t.Errorf("PercentageFromDiffFile(%q) = %f, want %f", tc.input, result, tc.expected)
		}
	}
}

func TestIsLinkedLatestAndBaseline(t *testing.T) {
	tests := []struct {
		latest   string
		baseline string
		expected bool
	}{
		{"login.latest.png", "login.baseline.png", true},
		{"/path/to/login.latest.png", "/other/path/login.baseline.png", true},
		{"login.latest.png", "header.baseline.png", false},
		{"header-content.latest.png", "header-content.baseline.png", true},
	}

	for _, tc := range tests {
		result := IsLinkedLatestAndBaseline(tc.latest, tc.baseline)
		if result != tc.expected {
			t.Errorf("IsLinkedLatestAndBaseline(%q, %q) = %v, want %v",
				tc.latest, tc.baseline, result, tc.expected)
		}
	}
}

func TestScreenshotFilenameFilter(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"login.png", true},
		{"header-content.png", true},
		{"test_case.png", true},
		{"test&case.png", true},
		{"test(1).png", true},
		{"test#1.png", true},
		{"login.jpg", true},
		{"login.jpeg", true},
		{"login.bmp", true},
		{"login.webp", true},
		{"login.gif", true},
		{"test file.png", true},
		{"test@file.png", true},
		{"test_test.test.png", true},
		{"test>file.png", false},
		{"test|file.png", false},
		{"", false},
		{"../../../etc/passwd.png", false},
		{"dir/file.png", false},
		{"..\\windows\\system32\\cmd.png", false},
		{"/absolute/path.png", false},
	}

	for _, tc := range tests {
		result := ScreenshotFilenameFilter(tc.input)
		if result != tc.expected {
			t.Errorf("ScreenshotFilenameFilter(%q) = %v, want %v", tc.input, result, tc.expected)
		}
	}
}

func TestClearDirectory(t *testing.T) {
	dir := t.TempDir()

	for _, name := range []string{"file1.txt", "file2.txt", "file3.txt"} {
		f, err := createTempFile(dir, name)
		if err != nil {
			t.Fatal(err)
		}
		f.Close()
	}

	files, err := ListFilesNoPath(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 3 {
		t.Fatalf("expected 3 files, got %d", len(files))
	}

	if err := ClearDirectory(dir); err != nil {
		t.Fatal(err)
	}

	files, err = ListFilesNoPath(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 0 {
		t.Fatalf("expected 0 files after clear, got %d", len(files))
	}
}

func createTempFile(dir, name string) (*os.File, error) {
	return os.Create(dir + "/" + name)
}

func TestListFiles(t *testing.T) {
	dir := t.TempDir()

	for _, name := range []string{"a.png", "b.png"} {
		f, err := createTempFile(dir, name)
		if err != nil {
			t.Fatal(err)
		}
		f.Close()
	}

	files, err := ListFiles(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 2 {
		t.Fatalf("expected 2 files, got %d", len(files))
	}
}

func TestCreateDirectory(t *testing.T) {
	dir := t.TempDir()
	newDir := dir + "/nested/deep/dir"

	err := CreateDirectory(newDir)
	if err != nil {
		t.Fatalf("CreateDirectory failed: %v", err)
	}

	if !IsProjectExist(newDir) {
		t.Error("directory was not created")
	}
}

func TestIsProjectExist_NonExistent(t *testing.T) {
	if IsProjectExist("/nonexistent/path/that/does/not/exist") {
		t.Error("IsProjectExist returned true for non-existent path")
	}
}

func TestMoveFiles(t *testing.T) {
	srcDir := t.TempDir()
	dstDir := t.TempDir()

	os.WriteFile(srcDir+"/login.png", []byte("image data"), 0644)
	os.WriteFile(srcDir+"/header.png", []byte("image data2"), 0644)

	os.Mkdir(srcDir+"/subdir", 0755)

	err := MoveFiles(srcDir, dstDir, "testToLatest")
	if err != nil {
		t.Fatalf("MoveFiles failed: %v", err)
	}

	if _, err := os.Stat(dstDir + "/login.latest.png"); os.IsNotExist(err) {
		t.Error("expected login.latest.png to exist")
	}
	if _, err := os.Stat(dstDir + "/header.latest.png"); os.IsNotExist(err) {
		t.Error("expected header.latest.png to exist")
	}
}

func TestMoveFiles_DefaultDirection(t *testing.T) {
	srcDir := t.TempDir()
	dstDir := t.TempDir()

	os.WriteFile(srcDir+"/test.png", []byte("data"), 0644)

	err := MoveFiles(srcDir, dstDir, "")
	if err != nil {
		t.Fatalf("MoveFiles failed: %v", err)
	}

	if _, err := os.Stat(dstDir + "/test.png"); os.IsNotExist(err) {
		t.Error("expected test.png to exist in destination")
	}
}

func TestMoveFiles_SourceNotExist(t *testing.T) {
	err := MoveFiles("/nonexistent/source", "/tmp", "")
	if err == nil {
		t.Error("expected error for non-existent source directory")
	}
}

func TestMoveInBaselineFilesAccordingToLatestFiles(t *testing.T) {
	baselineDir := t.TempDir()
	latestDir := t.TempDir()

	os.WriteFile(baselineDir+"/login.baseline.png", []byte("baseline"), 0644)
	os.WriteFile(baselineDir+"/header.baseline.png", []byte("baseline2"), 0644)

	os.WriteFile(latestDir+"/login.latest.png", []byte("latest"), 0644)
	os.WriteFile(latestDir+"/unknown.latest.png", []byte("latest2"), 0644)

	os.WriteFile(latestDir+"/readme.txt", []byte("text"), 0644)

	os.Mkdir(latestDir+"/subdir", 0755)

	err := MoveInBaselineFilesAccordingToLatestFiles(baselineDir, latestDir)
	if err != nil {
		t.Fatalf("MoveInBaselineFilesAccordingToLatestFiles failed: %v", err)
	}

	if _, err := os.Stat(latestDir + "/login.baseline.png"); os.IsNotExist(err) {
		t.Error("expected login.baseline.png to be copied to latest dir")
	}

	if _, err := os.Stat(latestDir + "/header.baseline.png"); !os.IsNotExist(err) {
		t.Error("expected header.baseline.png NOT to be copied")
	}
}

func TestMoveInBaselineFilesAccordingToLatestFiles_BaselineNotExist(t *testing.T) {
	latestDir := t.TempDir()
	err := MoveInBaselineFilesAccordingToLatestFiles("/nonexistent", latestDir)
	if err == nil {
		t.Error("expected error for non-existent baseline directory")
	}
}

func TestMoveInBaselineFilesAccordingToLatestFiles_LatestNotExist(t *testing.T) {
	baselineDir := t.TempDir()
	err := MoveInBaselineFilesAccordingToLatestFiles(baselineDir, "/nonexistent")
	if err == nil {
		t.Error("expected error for non-existent latest directory")
	}
}

func TestListFilesNoPath(t *testing.T) {
	dir := t.TempDir()

	os.WriteFile(dir+"/a.png", []byte("a"), 0644)
	os.WriteFile(dir+"/b.png", []byte("b"), 0644)
	os.Mkdir(dir+"/subdir", 0755)

	files, err := ListFilesNoPath(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 2 {
		t.Fatalf("expected 2 files, got %d", len(files))
	}
}

func TestListFilesNoPath_EmptyDir(t *testing.T) {
	dir := t.TempDir()

	files, err := ListFilesNoPath(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 0 {
		t.Fatalf("expected 0 files, got %d", len(files))
	}
}

func TestListFilesNoPath_NonExistentDir(t *testing.T) {
	_, err := ListFilesNoPath("/nonexistent/dir")
	if err == nil {
		t.Error("expected error for non-existent directory")
	}
}

func TestListFiles_NonExistentDir(t *testing.T) {
	_, err := ListFiles("/nonexistent/dir")
	if err == nil {
		t.Error("expected error for non-existent directory")
	}
}

func TestListFiles_SkipsDirectories(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(dir+"/file.txt", []byte("data"), 0644)
	os.Mkdir(dir+"/subdir", 0755)

	files, err := ListFiles(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 1 {
		t.Fatalf("expected 1 file, got %d", len(files))
	}
}

func TestClearDirectory_NonExistentDir(t *testing.T) {
	err := ClearDirectory("/nonexistent/dir")
	if err == nil {
		t.Error("expected error for non-existent directory")
	}
}

func TestPercentageFromDiffFile_EdgeCases(t *testing.T) {
	tests := []struct {
		input    string
		expected float64
	}{
		{"simple.png", 0.0},
		{"a.b.png", 0.0},
		{"login.notnum.diff.png", 0.0},
	}

	for _, tc := range tests {
		result := PercentageFromDiffFile(tc.input)
		if result != tc.expected {
			t.Errorf("PercentageFromDiffFile(%q) = %f, want %f", tc.input, result, tc.expected)
		}
	}
}

func TestScreenshotFilenameFilter_LongFilename(t *testing.T) {
	if ScreenshotFilenameFilter(strings.Repeat("a", 251)+".png") != true {
		t.Error("expected 255-char filename to pass")
	}
	if ScreenshotFilenameFilter(strings.Repeat("a", 252)+".png") != false {
		t.Error("expected 256-char filename to fail")
	}
}

func TestCopyFile(t *testing.T) {
	dir := t.TempDir()
	src := dir + "/src.txt"
	dst := dir + "/dst.txt"

	os.WriteFile(src, []byte("hello"), 0644)

	err := copyFile(src, dst)
	if err != nil {
		t.Fatalf("copyFile failed: %v", err)
	}

	data, err := os.ReadFile(dst)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "hello" {
		t.Errorf("expected 'hello', got %q", string(data))
	}
}

func TestCopyFile_SrcNotExist(t *testing.T) {
	err := copyFile("/nonexistent", "/tmp/dst")
	if err == nil {
		t.Error("expected error for non-existent source")
	}
}

func TestMoveFiles_CopyError(t *testing.T) {
	srcDir := t.TempDir()
	os.WriteFile(srcDir+"/test.png", []byte("data"), 0644)

	err := MoveFiles(srcDir, "/nonexistent/dest/dir", "")
	if err != nil {
		t.Fatalf("MoveFiles should not return error for copy failures, got %v", err)
	}
}

func TestClearDirectory_WithSubdirectory(t *testing.T) {
	dir := t.TempDir()
	subDir := filepath.Join(dir, "subdir")
	os.Mkdir(subDir, 0755)
	os.WriteFile(filepath.Join(subDir, "file.txt"), []byte("data"), 0644)

	err := ClearDirectory(dir)
	if err == nil {
		t.Error("expected error when trying to remove non-empty subdirectory")
	}
}

func TestMoveInBaselineFilesAccordingToLatestFiles_CopyFails(t *testing.T) {
	baselineDir := t.TempDir()
	latestDir := t.TempDir()

	os.WriteFile(baselineDir+"/login.baseline.png", []byte("baseline"), 0644)
	os.WriteFile(latestDir+"/login.latest.png", []byte("latest"), 0644)

	os.Chmod(baselineDir+"/login.baseline.png", 0000)
	defer os.Chmod(baselineDir+"/login.baseline.png", 0644)

	err := MoveInBaselineFilesAccordingToLatestFiles(baselineDir, latestDir)
	if err != nil {
		t.Fatalf("expected no error (copy failure is logged), got %v", err)
	}
}
