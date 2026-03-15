package utils

import (
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

func createTestPNG(t *testing.T, path string, width, height int, col color.Color) {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, col)
		}
	}
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if err := png.Encode(f, img); err != nil {
		t.Fatal(err)
	}
}

func TestComparePNG_IdenticalImages(t *testing.T) {
	dir := t.TempDir()
	baseline := filepath.Join(dir, "test.baseline.png")
	latest := filepath.Join(dir, "test.latest.png")

	createTestPNG(t, baseline, 100, 100, color.RGBA{R: 255, G: 0, B: 0, A: 255})
	createTestPNG(t, latest, 100, 100, color.RGBA{R: 255, G: 0, B: 0, A: 255})

	diffPct, err := ComparePNG(baseline, latest, 0, false)
	if err != nil {
		t.Fatalf("ComparePNG failed: %v", err)
	}

	if diffPct != 0 {
		t.Errorf("Expected 0%% diff for identical images, got %f", diffPct)
	}
}

func TestComparePNG_DifferentImages(t *testing.T) {
	dir := t.TempDir()
	baseline := filepath.Join(dir, "test.baseline.png")
	latest := filepath.Join(dir, "test.latest.png")

	createTestPNG(t, baseline, 100, 100, color.RGBA{R: 255, G: 0, B: 0, A: 255})
	createTestPNG(t, latest, 100, 100, color.RGBA{R: 0, G: 255, B: 0, A: 255})

	diffPct, err := ComparePNG(baseline, latest, 0, false)
	if err != nil {
		t.Fatalf("ComparePNG failed: %v", err)
	}

	if diffPct != 1.0 {
		t.Errorf("Expected 100%% diff for completely different images, got %f", diffPct)
	}
}

func TestComparePNG_PartialDiff(t *testing.T) {
	dir := t.TempDir()
	baseline := filepath.Join(dir, "test.baseline.png")
	latest := filepath.Join(dir, "test.latest.png")

	baseImg := image.NewRGBA(image.Rect(0, 0, 10, 10))
	for y := 0; y < 10; y++ {
		for x := 0; x < 10; x++ {
			baseImg.Set(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}
	saveTestPNG(t, baseline, baseImg)

	latImg := image.NewRGBA(image.Rect(0, 0, 10, 10))
	for y := 0; y < 10; y++ {
		for x := 0; x < 10; x++ {
			if x < 5 {
				latImg.Set(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
			} else {
				latImg.Set(x, y, color.RGBA{R: 0, G: 255, B: 0, A: 255})
			}
		}
	}
	saveTestPNG(t, latest, latImg)

	diffPct, err := ComparePNG(baseline, latest, 0, false)
	if err != nil {
		t.Fatalf("ComparePNG failed: %v", err)
	}

	expected := 0.5
	if diffPct != expected {
		t.Errorf("Expected %f diff, got %f", expected, diffPct)
	}
}

func TestIsRectangleIgnored(t *testing.T) {
	tests := []struct {
		name     string
		ignoring Rectangle
		diff     Rectangle
		expected bool
	}{
		{
			name:     "fully contained",
			ignoring: Rectangle{X: 0, Y: 0, Width: 100, Height: 100},
			diff:     Rectangle{X: 10, Y: 10, Width: 20, Height: 20},
			expected: true,
		},
		{
			name:     "exact match",
			ignoring: Rectangle{X: 10, Y: 10, Width: 20, Height: 20},
			diff:     Rectangle{X: 10, Y: 10, Width: 20, Height: 20},
			expected: true,
		},
		{
			name:     "not contained - right overflow",
			ignoring: Rectangle{X: 0, Y: 0, Width: 50, Height: 50},
			diff:     Rectangle{X: 40, Y: 10, Width: 20, Height: 20},
			expected: false,
		},
		{
			name:     "not contained - below overflow",
			ignoring: Rectangle{X: 0, Y: 0, Width: 50, Height: 50},
			diff:     Rectangle{X: 10, Y: 40, Width: 20, Height: 20},
			expected: false,
		},
		{
			name:     "not contained - left overflow",
			ignoring: Rectangle{X: 20, Y: 0, Width: 50, Height: 50},
			diff:     Rectangle{X: 10, Y: 10, Width: 20, Height: 20},
			expected: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsRectangleIgnored(tc.ignoring, tc.diff)
			if result != tc.expected {
				t.Errorf("IsRectangleIgnored() = %v, want %v", result, tc.expected)
			}
		})
	}
}

func TestIsRectanglesAllIgnored(t *testing.T) {
	tests := []struct {
		name     string
		ignoring []Rectangle
		diff     []Rectangle
		expected bool
	}{
		{
			name: "all diffs covered by one ignoring",
			ignoring: []Rectangle{
				{X: 0, Y: 0, Width: 100, Height: 100},
			},
			diff: []Rectangle{
				{X: 10, Y: 10, Width: 20, Height: 20},
				{X: 50, Y: 50, Width: 10, Height: 10},
			},
			expected: true,
		},
		{
			name: "diffs covered by multiple ignorings",
			ignoring: []Rectangle{
				{X: 0, Y: 0, Width: 50, Height: 50},
				{X: 50, Y: 50, Width: 50, Height: 50},
			},
			diff: []Rectangle{
				{X: 10, Y: 10, Width: 20, Height: 20},
				{X: 60, Y: 60, Width: 10, Height: 10},
			},
			expected: true,
		},
		{
			name: "one diff not covered",
			ignoring: []Rectangle{
				{X: 0, Y: 0, Width: 50, Height: 50},
			},
			diff: []Rectangle{
				{X: 10, Y: 10, Width: 20, Height: 20},
				{X: 60, Y: 60, Width: 10, Height: 10},
			},
			expected: false,
		},
		{
			name:     "empty diffs",
			ignoring: []Rectangle{{X: 0, Y: 0, Width: 50, Height: 50}},
			diff:     []Rectangle{},
			expected: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := IsRectanglesAllIgnored(tc.ignoring, tc.diff)
			if result != tc.expected {
				t.Errorf("IsRectanglesAllIgnored() = %v, want %v", result, tc.expected)
			}
		})
	}
}

func TestClusterToRectangle(t *testing.T) {
	cluster := DiffCluster{Left: 10, Top: 20, Right: 50, Bottom: 80}
	rect := ClusterToRectangle(cluster)

	if rect.X != 10 || rect.Y != 20 || rect.Width != 40 || rect.Height != 60 {
		t.Errorf("ClusterToRectangle() = %+v, want x=10 y=20 w=40 h=60", rect)
	}
}

func TestFindDiffClusters_IdenticalImages(t *testing.T) {
	dir := t.TempDir()
	img1 := filepath.Join(dir, "img1.png")
	img2 := filepath.Join(dir, "img2.png")

	createTestPNG(t, img1, 50, 50, color.RGBA{R: 100, G: 100, B: 100, A: 255})
	createTestPNG(t, img2, 50, 50, color.RGBA{R: 100, G: 100, B: 100, A: 255})

	clusters, err := FindDiffClusters(img1, img2, true, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(clusters) != 0 {
		t.Errorf("Expected 0 clusters for identical images, got %d", len(clusters))
	}
}

func saveTestPNG(t *testing.T, path string, img image.Image) {
	t.Helper()
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if err := png.Encode(f, img); err != nil {
		t.Fatal(err)
	}
}

func TestRectangleToCoordinate(t *testing.T) {
	r := Rectangle{X: 10, Y: 20, Width: 30, Height: 40}
	c := RectangleToCoordinate(r)

	if c.TL.X != 10 || c.TL.Y != 20 {
		t.Errorf("TL = (%d, %d), want (10, 20)", c.TL.X, c.TL.Y)
	}
	if c.TR.X != 40 || c.TR.Y != 20 {
		t.Errorf("TR = (%d, %d), want (40, 20)", c.TR.X, c.TR.Y)
	}
	if c.BR.X != 40 || c.BR.Y != 60 {
		t.Errorf("BR = (%d, %d), want (40, 60)", c.BR.X, c.BR.Y)
	}
	if c.BL.X != 10 || c.BL.Y != 60 {
		t.Errorf("BL = (%d, %d), want (10, 60)", c.BL.X, c.BL.Y)
	}
}

func TestCompare(t *testing.T) {
	dir := t.TempDir()
	baseline := filepath.Join(dir, "test.baseline.png")
	latest := filepath.Join(dir, "test.latest.png")

	createTestPNG(t, baseline, 10, 10, color.RGBA{R: 255, G: 0, B: 0, A: 255})
	createTestPNG(t, latest, 10, 10, color.RGBA{R: 255, G: 0, B: 0, A: 255})

	err := Compare(baseline, latest, 0, false)
	if err != nil {
		t.Fatalf("Compare failed: %v", err)
	}
}

func TestCompare_Error(t *testing.T) {
	err := Compare("/nonexistent/baseline.png", "/nonexistent/latest.png", 0, false)
	if err == nil {
		t.Error("expected error for non-existent files")
	}
}

func TestComparePNG_BaselineNotExist(t *testing.T) {
	dir := t.TempDir()
	latest := filepath.Join(dir, "test.latest.png")
	createTestPNG(t, latest, 10, 10, color.RGBA{R: 255, A: 255})

	_, err := ComparePNG("/nonexistent.png", latest, 0, false)
	if err == nil {
		t.Error("expected error for non-existent baseline")
	}
}

func TestComparePNG_LatestNotExist(t *testing.T) {
	dir := t.TempDir()
	baseline := filepath.Join(dir, "test.baseline.png")
	createTestPNG(t, baseline, 10, 10, color.RGBA{R: 255, A: 255})

	_, err := ComparePNG(baseline, "/nonexistent.png", 0, false)
	if err == nil {
		t.Error("expected error for non-existent latest")
	}
}

func TestComparePNG_DifferentSizes(t *testing.T) {
	dir := t.TempDir()
	baseline := filepath.Join(dir, "test.baseline.png")
	latest := filepath.Join(dir, "test.latest.png")

	createTestPNG(t, baseline, 10, 10, color.RGBA{R: 255, A: 255})
	createTestPNG(t, latest, 20, 20, color.RGBA{R: 255, A: 255})

	diffPct, err := ComparePNG(baseline, latest, 0, false)
	if err != nil {
		t.Fatalf("ComparePNG failed: %v", err)
	}

	if diffPct == 0 {
		t.Error("expected non-zero diff for different sized images with non-black content")
	}
}

func TestComparePNG_WithThreshold(t *testing.T) {
	dir := t.TempDir()
	baseline := filepath.Join(dir, "test.baseline.png")
	latest := filepath.Join(dir, "test.latest.png")

	createTestPNG(t, baseline, 10, 10, color.RGBA{R: 100, G: 100, B: 100, A: 255})
	createTestPNG(t, latest, 10, 10, color.RGBA{R: 101, G: 100, B: 100, A: 255})

	diffPct, err := ComparePNG(baseline, latest, 0.5, false)
	if err != nil {
		t.Fatalf("ComparePNG failed: %v", err)
	}
	if diffPct != 0 {
		t.Errorf("expected 0%% diff with high threshold, got %f", diffPct)
	}
}

func TestFindDiffClusters_DifferentImages_NoClustering(t *testing.T) {
	dir := t.TempDir()
	img1 := filepath.Join(dir, "img1.png")
	img2 := filepath.Join(dir, "img2.png")

	createTestPNG(t, img1, 10, 10, color.RGBA{R: 255, A: 255})
	createTestPNG(t, img2, 10, 10, color.RGBA{G: 255, A: 255})

	clusters, err := FindDiffClusters(img1, img2, false, 10)
	if err != nil {
		t.Fatal(err)
	}

	if len(clusters) != 100 {
		t.Errorf("expected 100 individual clusters, got %d", len(clusters))
	}
}

func TestFindDiffClusters_DifferentImages_WithClustering(t *testing.T) {
	dir := t.TempDir()
	img1 := filepath.Join(dir, "img1.png")
	img2 := filepath.Join(dir, "img2.png")

	createTestPNG(t, img1, 10, 10, color.RGBA{R: 255, A: 255})
	createTestPNG(t, img2, 10, 10, color.RGBA{G: 255, A: 255})

	clusters, err := FindDiffClusters(img1, img2, true, 50)
	if err != nil {
		t.Fatal(err)
	}

	if len(clusters) != 1 {
		t.Errorf("expected 1 cluster with large cluster size, got %d", len(clusters))
	}
}

func TestFindDiffClusters_DefaultClusterSize(t *testing.T) {
	dir := t.TempDir()
	img1 := filepath.Join(dir, "img1.png")
	img2 := filepath.Join(dir, "img2.png")

	createTestPNG(t, img1, 10, 10, color.RGBA{R: 255, A: 255})
	createTestPNG(t, img2, 10, 10, color.RGBA{G: 255, A: 255})

	clusters, err := FindDiffClusters(img1, img2, true, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(clusters) == 0 {
		t.Error("expected non-zero clusters")
	}
}

func TestFindDiffClusters_BaselineNotExist(t *testing.T) {
	dir := t.TempDir()
	img2 := filepath.Join(dir, "img2.png")
	createTestPNG(t, img2, 10, 10, color.RGBA{R: 255, A: 255})

	_, err := FindDiffClusters("/nonexistent.png", img2, true, 10)
	if err == nil {
		t.Error("expected error for non-existent baseline")
	}
}

func TestFindDiffClusters_LatestNotExist(t *testing.T) {
	dir := t.TempDir()
	img1 := filepath.Join(dir, "img1.png")
	createTestPNG(t, img1, 10, 10, color.RGBA{R: 255, A: 255})

	_, err := FindDiffClusters(img1, "/nonexistent.png", true, 10)
	if err == nil {
		t.Error("expected error for non-existent latest")
	}
}

func TestFindDiffClusters_DifferentSizes(t *testing.T) {
	dir := t.TempDir()
	img1 := filepath.Join(dir, "img1.png")
	img2 := filepath.Join(dir, "img2.png")

	createTestPNG(t, img1, 5, 5, color.RGBA{R: 255, A: 255})
	createTestPNG(t, img2, 10, 10, color.RGBA{R: 255, A: 255})

	clusters, err := FindDiffClusters(img1, img2, true, 50)
	if err != nil {
		t.Fatal(err)
	}
	
	if len(clusters) == 0 {
		t.Error("expected non-zero clusters for different sized images")
	}
}

func TestFindDiffClusters_SmallClusterSize(t *testing.T) {
	dir := t.TempDir()
	img1 := filepath.Join(dir, "img1.png")
	img2 := filepath.Join(dir, "img2.png")

	createTestPNG(t, img1, 20, 20, color.RGBA{R: 255, A: 255})
	createTestPNG(t, img2, 20, 20, color.RGBA{G: 255, A: 255})

	clusters, err := FindDiffClusters(img1, img2, true, 5)
	if err != nil {
		t.Fatal(err)
	}
	
	if len(clusters) <= 1 {
		t.Errorf("expected multiple clusters with small cluster size, got %d", len(clusters))
	}
}

func TestIsRectangleIgnored_TopOverflow(t *testing.T) {
	ignoring := Rectangle{X: 0, Y: 20, Width: 100, Height: 80}
	diff := Rectangle{X: 10, Y: 10, Width: 20, Height: 20}
	if IsRectangleIgnored(ignoring, diff) {
		t.Error("expected diff not to be ignored (top overflow)")
	}
}

func TestIsRectanglesAllIgnored_EmptyIgnoring(t *testing.T) {
	result := IsRectanglesAllIgnored(nil, []Rectangle{{X: 10, Y: 10, Width: 20, Height: 20}})
	if result {
		t.Error("expected false when no ignoring rectangles")
	}
}

func TestIsRectanglesAllIgnored_BothEmpty(t *testing.T) {
	result := IsRectanglesAllIgnored(nil, nil)
	if !result {
		t.Error("expected true when both slices are empty")
	}
}

func TestComparePNG_SmallImage(t *testing.T) {
	dir := t.TempDir()
	baseline := filepath.Join(dir, "small.baseline.png")
	latest := filepath.Join(dir, "small.latest.png")

	createTestPNG(t, baseline, 2, 2, color.RGBA{R: 255, A: 255})
	createTestPNG(t, latest, 2, 2, color.RGBA{R: 255, A: 255})

	diffPct, err := ComparePNG(baseline, latest, 0, false)
	if err != nil {
		t.Fatalf("ComparePNG failed: %v", err)
	}
	if diffPct != 0 {
		t.Errorf("expected 0%% diff, got %f", diffPct)
	}
}

func TestComparePNG_SinglePixel(t *testing.T) {
	dir := t.TempDir()
	baseline := filepath.Join(dir, "pixel.baseline.png")
	latest := filepath.Join(dir, "pixel.latest.png")

	createTestPNG(t, baseline, 1, 1, color.RGBA{R: 255, A: 255})
	createTestPNG(t, latest, 1, 1, color.RGBA{G: 255, A: 255})

	diffPct, err := ComparePNG(baseline, latest, 0, false)
	if err != nil {
		t.Fatalf("ComparePNG failed: %v", err)
	}
	if diffPct != 1.0 {
		t.Errorf("expected 100%% diff, got %f", diffPct)
	}
}

func TestFindDiffClusters_ClusterUpdate(t *testing.T) {
	dir := t.TempDir()
	img1 := filepath.Join(dir, "img1.png")
	img2 := filepath.Join(dir, "img2.png")

	baseImg := image.NewRGBA(image.Rect(0, 0, 10, 10))
	for y := 0; y < 10; y++ {
		for x := 0; x < 10; x++ {
			baseImg.Set(x, y, color.RGBA{R: 255, A: 255})
		}
	}
	saveTestPNG(t, img1, baseImg)

	latImg := image.NewRGBA(image.Rect(0, 0, 10, 10))
	for y := 0; y < 10; y++ {
		for x := 0; x < 10; x++ {
			latImg.Set(x, y, color.RGBA{R: 255, A: 255})
		}
	}
	
	latImg.Set(2, 3, color.RGBA{G: 255, A: 255})
	latImg.Set(5, 7, color.RGBA{G: 255, A: 255})
	
	latImg.Set(1, 1, color.RGBA{G: 255, A: 255})
	saveTestPNG(t, img2, latImg)

	clusters, err := FindDiffClusters(img1, img2, true, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(clusters) != 1 {
		t.Fatalf("expected 1 cluster, got %d", len(clusters))
	}
	
	c := clusters[0]
	if c.Left != 1 || c.Top != 1 || c.Right != 6 || c.Bottom != 8 {
		t.Errorf("cluster bounds = (%d,%d,%d,%d), want (1,1,6,8)", c.Left, c.Top, c.Right, c.Bottom)
	}
}
