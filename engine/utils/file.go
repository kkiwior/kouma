package utils

import (
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

func MoveFiles(sourceDirectory, destDirectory, direction string) error {
	entries, err := os.ReadDir(sourceDirectory)
	if err != nil {
		return fmt.Errorf("reading source directory %s: %w", sourceDirectory, err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		fileName := entry.Name()
		var destName string
		switch direction {
		case "testToLatest":
			ext := filepath.Ext(fileName)
			destName = strings.Replace(fileName, ext, ".latest"+ext, 1)
		default:
			destName = fileName
		}

		src := filepath.Join(sourceDirectory, fileName)
		dst := filepath.Join(destDirectory, destName)

		if err := copyFile(src, dst); err != nil {
			ProcessLogger(fmt.Sprintf("copy file failed: %v", err))
			continue
		}

		ProcessLogger(fmt.Sprintf("copied file: %s -> %s", src, dst))
	}
	return nil
}

func MoveInBaselineFilesAccordingToLatestFiles(baselineDirectory, latestDirectory string) error {
	ProcessLogger("FBI --> info: copy baseline files to build path, starting ...")

	baselineEntries, err := os.ReadDir(baselineDirectory)
	if err != nil {
		return fmt.Errorf("reading baseline directory: %w", err)
	}

	baselineFilesMap := make(map[string]string)
	for _, e := range baselineEntries {
		if !e.IsDir() && strings.Contains(e.Name(), ".baseline.") {
			ext := filepath.Ext(e.Name())
			basename := strings.TrimSuffix(e.Name(), ".baseline"+ext)
			baselineFilesMap[basename] = e.Name()
		}
	}

	latestEntries, err := os.ReadDir(latestDirectory)
	if err != nil {
		return fmt.Errorf("reading latest directory: %w", err)
	}

	for _, e := range latestEntries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		ext := filepath.Ext(name)
		if !strings.Contains(name, ".latest"+ext) {
			continue
		}
		basename := strings.TrimSuffix(name, ".latest"+ext)
		if actualBaselineName, exists := baselineFilesMap[basename]; exists {
			src := filepath.Join(baselineDirectory, actualBaselineName)
			dst := filepath.Join(latestDirectory, actualBaselineName)
			if err := copyFile(src, dst); err != nil {
				ProcessLogger(fmt.Sprintf("failed to copy baseline: %v", err))
				continue
			}
			ProcessLogger(fmt.Sprintf("copied baseline %s to latest %s", src, dst))
		}
	}
	ProcessLogger("FBI --> info: ... copy baseline files to build path, done.")
	return nil
}

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0644)
}

func IsLinkedLatestAndBaseline(latestFilename, baselineFilename string) bool {
	latestExt := filepath.Ext(latestFilename)
	baselineExt := filepath.Ext(baselineFilename)
	latestBase := strings.TrimSuffix(filepath.Base(latestFilename), ".latest"+latestExt)
	baselineBase := strings.TrimSuffix(filepath.Base(baselineFilename), ".baseline"+baselineExt)
	return latestBase == baselineBase
}

func ClearDirectory(directory string) error {
	entries, err := os.ReadDir(directory)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if err := os.Remove(filepath.Join(directory, e.Name())); err != nil {
			return err
		}
	}
	return nil
}

func ListFiles(directory string) ([]string, error) {
	entries, err := os.ReadDir(directory)
	if err != nil {
		return nil, err
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() {
			files = append(files, filepath.Join(directory, e.Name()))
		}
	}
	return files, nil
}

func ListFilesNoPath(directory string) ([]string, error) {
	entries, err := os.ReadDir(directory)
	if err != nil {
		return nil, err
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() {
			files = append(files, e.Name())
		}
	}
	return files, nil
}

func CreateDirectory(directory string) error {
	return os.MkdirAll(directory, 0755)
}

func ToCaseName(filename string) string {
	base := filepath.Base(filename)
	ext := filepath.Ext(filename)
	parts := strings.SplitN(base, ".", 2)
	return parts[0] + ext
}

func ToCaseBaseName(filename string) string {
	base := filepath.Base(filename)
	return strings.SplitN(base, ".", 2)[0]
}

func ToDiffFilename(filename string) string {
	parts := strings.SplitN(filepath.Base(filename), ".", 2)
	dir := filepath.Dir(filename)
	return filepath.Join(dir, parts[0]+".diff.png")
}

func ToDiffFileWithPercentage(filename string, percentage float64) string {
	diffSuffix := int(math.Round(percentage * math.Pow10(8)))
	return strings.Replace(filename, ".diff.png", fmt.Sprintf(".%d.diff.png", diffSuffix), 1)
}

func PercentageFromDiffFile(filename string) float64 {
	base := filepath.Base(filename)
	parts := strings.Split(base, ".")
	reversed := reverseStrings(parts)
	if len(reversed) < 3 {
		return 0
	}
	val, err := strconv.ParseFloat(reversed[2], 64)
	if err != nil {
		return 0
	}
	return val / math.Pow10(8)
}

func ScreenshotFilenameFilter(screenshotFilename string) bool {
	ext := strings.ToLower(filepath.Ext(screenshotFilename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".bmp" && ext != ".webp" && ext != ".gif" {
		fmt.Printf("filename unacceptable: %q, unsupported extension %q\n", screenshotFilename, ext)
		return false
	}

	if len(screenshotFilename) > 255 {
		fmt.Printf("filename unacceptable: %q, longer than 255\n", screenshotFilename)
		return false
	}

	name := strings.TrimSuffix(screenshotFilename, ext)
	format := regexp.MustCompile(`^[^<>:"/\\|?*\x00]+$`)
	if !format.MatchString(name) {
		fmt.Printf("filename unacceptable: %q, contains invalid characters\n", screenshotFilename)
		return false
	}

	return true
}

func IsProjectExist(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func reverseStrings(s []string) []string {
	result := make([]string, len(s))
	for i, v := range s {
		result[len(s)-1-i] = v
	}
	return result
}
