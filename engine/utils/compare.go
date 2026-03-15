package utils

import (
	"fmt"
	_ "golang.org/x/image/bmp"
	_ "golang.org/x/image/webp"
	"image"
	"image/color"
	"image/gif"
	_ "image/jpeg"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type CompareResult struct {
	DiffPercentage float64
	DiffFilePath   string
}

func ComparePNG(baselineFile, latestFile string, colorThreshold float64, detectAntialiasing bool) (float64, error) {
	baselineImg, err := readImage(baselineFile)
	if err != nil {
		return 0, fmt.Errorf("reading baseline %s: %w", baselineFile, err)
	}

	latestImg, err := readImage(latestFile)
	if err != nil {
		return 0, fmt.Errorf("reading latest %s: %w", latestFile, err)
	}

	baseBounds := baselineImg.Bounds()
	latestBounds := latestImg.Bounds()

	width := baseBounds.Dx()
	height := baseBounds.Dy()

	if latestBounds.Dx() > width {
		width = latestBounds.Dx()
	}
	if latestBounds.Dy() > height {
		height = latestBounds.Dy()
	}

	diffImg := image.NewRGBA(image.Rect(0, 0, width, height))
	threshold := colorThreshold * 255.0

	var diffPixels int64
	var mu sync.Mutex
	var wg sync.WaitGroup

	numWorkers := 4
	rowsPerWorker := height / numWorkers
	if rowsPerWorker == 0 {
		rowsPerWorker = height
		numWorkers = 1
	}

	for w := 0; w < numWorkers; w++ {
		startY := w * rowsPerWorker
		endY := startY + rowsPerWorker
		if w == numWorkers-1 {
			endY = height
		}

		wg.Add(1)
		go func(sy, ey int) {
			defer wg.Done()
			var localDiff int64
			for y := sy; y < ey; y++ {
				for x := 0; x < width; x++ {
					var baseR, baseG, baseB, baseA uint32
					var latR, latG, latB, latA uint32

					if x < baseBounds.Dx() && y < baseBounds.Dy() {
						baseR, baseG, baseB, baseA = baselineImg.At(x+baseBounds.Min.X, y+baseBounds.Min.Y).RGBA()
					}
					if x < latestBounds.Dx() && y < latestBounds.Dy() {
						latR, latG, latB, latA = latestImg.At(x+latestBounds.Min.X, y+latestBounds.Min.Y).RGBA()
					}

					br, bg, bb, ba := float64(baseR>>8), float64(baseG>>8), float64(baseB>>8), float64(baseA>>8)
					lr, lg, lb, la := float64(latR>>8), float64(latG>>8), float64(latB>>8), float64(latA>>8)

					diff := math.Abs(br-lr) + math.Abs(bg-lg) + math.Abs(bb-lb) + math.Abs(ba-la)

					if diff > threshold*4 {
						diffImg.Set(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
						localDiff++
					} else {
						diffImg.Set(x, y, color.RGBA{
							R: uint8(lr * 0.3),
							G: uint8(lg * 0.3),
							B: uint8(lb * 0.3),
							A: 255,
						})
					}
				}
			}
			mu.Lock()
			diffPixels += localDiff
			mu.Unlock()
		}(startY, endY)
	}

	wg.Wait()

	totalPixels := width * height
	if totalPixels == 0 {
		return 0, nil
	}
	diffPercentage := float64(diffPixels) / float64(totalPixels)

	diffFilename := ToDiffFilename(latestFile)
	diffFileWithPercentage := ToDiffFileWithPercentage(diffFilename, diffPercentage)

	if err := writePNG(diffFileWithPercentage, diffImg); err != nil {
		return 0, fmt.Errorf("writing diff image: %w", err)
	}

	return diffPercentage, nil
}

func Compare(baselineFile, latestFile string, colorThreshold float64, detectAntialiasing bool) error {
	ext := strings.ToLower(filepath.Ext(latestFile))
	var diffPercentage float64
	var cmpErr error

	if ext == ".gif" {
		diffPercentage, cmpErr = CompareGIF(baselineFile, latestFile, colorThreshold)
	} else {
		diffPercentage, cmpErr = ComparePNG(baselineFile, latestFile, colorThreshold, detectAntialiasing)
	}

	if cmpErr != nil {
		return cmpErr
	}

	ProcessLogger(fmt.Sprintf(`compared "%s" with "%s", diffPercentage: %f`, baselineFile, latestFile, diffPercentage))
	return nil
}

type DiffCluster struct {
	Left   int
	Top    int
	Right  int
	Bottom int
}

func ClusterToRectangle(cluster DiffCluster) Rectangle {
	return Rectangle{
		X:      float64(cluster.Left),
		Y:      float64(cluster.Top),
		Width:  float64(cluster.Right - cluster.Left),
		Height: float64(cluster.Bottom - cluster.Top),
	}
}

type Coordinate struct {
	TL, TR, BR, BL image.Point
}

func RectangleToCoordinate(r Rectangle) Coordinate {
	return Coordinate{
		TL: image.Pt(int(r.X), int(r.Y)),
		TR: image.Pt(int(r.X+r.Width), int(r.Y)),
		BR: image.Pt(int(r.X+r.Width), int(r.Y+r.Height)),
		BL: image.Pt(int(r.X), int(r.Y+r.Height)),
	}
}

func IsRectangleIgnored(ignoringRect, diffRect Rectangle) bool {
	ic := RectangleToCoordinate(ignoringRect)
	dc := RectangleToCoordinate(diffRect)

	return (dc.TL.X >= ic.TL.X && dc.TL.Y >= ic.TL.Y) &&
		(dc.TR.X <= ic.TR.X && dc.TR.Y >= ic.TR.Y) &&
		(dc.BR.X <= ic.BR.X && dc.BR.Y <= ic.BR.Y) &&
		(dc.BL.X >= ic.BL.X && dc.BL.Y <= ic.BL.Y)
}

func IsRectanglesAllIgnored(ignoringRectangles, diffRectangles []Rectangle) bool {
	for _, diffRect := range diffRectangles {
		ignored := false
		for _, ignoringRect := range ignoringRectangles {
			if IsRectangleIgnored(ignoringRect, diffRect) {
				ignored = true
				break
			}
		}
		if !ignored {
			return false
		}
	}
	return true
}

func FindDiffClusters(baselineFile, latestFile string, shouldCluster bool, clusterSize int) ([]DiffCluster, error) {
	baselineImg, err := readImage(baselineFile)
	if err != nil {
		return nil, fmt.Errorf("reading baseline %s: %w", baselineFile, err)
	}

	latestImg, err := readImage(latestFile)
	if err != nil {
		return nil, fmt.Errorf("reading latest %s: %w", latestFile, err)
	}

	baseBounds := baselineImg.Bounds()
	latestBounds := latestImg.Bounds()

	width := baseBounds.Dx()
	height := baseBounds.Dy()
	if latestBounds.Dx() > width {
		width = latestBounds.Dx()
	}
	if latestBounds.Dy() > height {
		height = latestBounds.Dy()
	}

	var diffPoints []image.Point
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			var baseR, baseG, baseB, baseA uint32
			var latR, latG, latB, latA uint32

			if x < baseBounds.Dx() && y < baseBounds.Dy() {
				baseR, baseG, baseB, baseA = baselineImg.At(x+baseBounds.Min.X, y+baseBounds.Min.Y).RGBA()
			}
			if x < latestBounds.Dx() && y < latestBounds.Dy() {
				latR, latG, latB, latA = latestImg.At(x+latestBounds.Min.X, y+latestBounds.Min.Y).RGBA()
			}

			if baseR != latR || baseG != latG || baseB != latB || baseA != latA {
				diffPoints = append(diffPoints, image.Pt(x, y))
			}
		}
	}

	if len(diffPoints) == 0 {
		return nil, nil
	}

	if !shouldCluster {
		clusters := make([]DiffCluster, len(diffPoints))
		for i, p := range diffPoints {
			clusters[i] = DiffCluster{Left: p.X, Top: p.Y, Right: p.X + 1, Bottom: p.Y + 1}
		}
		return clusters, nil
	}

	if clusterSize <= 0 {
		clusterSize = 50
	}

	type gridKey struct{ gx, gy int }
	grid := make(map[gridKey]DiffCluster)

	for _, p := range diffPoints {
		gx := p.X / clusterSize
		gy := p.Y / clusterSize
		key := gridKey{gx, gy}

		if cluster, ok := grid[key]; ok {
			if p.X < cluster.Left {
				cluster.Left = p.X
			}
			if p.Y < cluster.Top {
				cluster.Top = p.Y
			}
			if p.X+1 > cluster.Right {
				cluster.Right = p.X + 1
			}
			if p.Y+1 > cluster.Bottom {
				cluster.Bottom = p.Y + 1
			}
			grid[key] = cluster
		} else {
			grid[key] = DiffCluster{Left: p.X, Top: p.Y, Right: p.X + 1, Bottom: p.Y + 1}
		}
	}

	clusters := make([]DiffCluster, 0, len(grid))
	for _, c := range grid {
		clusters = append(clusters, c)
	}

	return clusters, nil
}

type Rectangle struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

func readImage(filename string) (image.Image, error) {
	f, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	img, _, err := image.Decode(f)
	return img, err
}

func writePNG(filename string, img image.Image) error {
	f, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer f.Close()
	return png.Encode(f, img)
}

func CompareGIF(baselineFile, latestFile string, colorThreshold float64) (float64, error) {
	bFile, err := os.Open(baselineFile)
	if err != nil {
		return 0, fmt.Errorf("reading baseline gif %s: %w", baselineFile, err)
	}
	defer bFile.Close()
	bGIF, err := gif.DecodeAll(bFile)
	if err != nil {
		return 0, fmt.Errorf("decoding baseline gif %s: %w", baselineFile, err)
	}

	lFile, err := os.Open(latestFile)
	if err != nil {
		return 0, fmt.Errorf("reading latest gif %s: %w", latestFile, err)
	}
	defer lFile.Close()
	lGIF, err := gif.DecodeAll(lFile)
	if err != nil {
		return 0, fmt.Errorf("decoding latest gif %s: %w", latestFile, err)
	}

	frames := len(bGIF.Image)
	if len(lGIF.Image) > frames {
		frames = len(lGIF.Image)
	}

	if frames == 0 {
		return 0, nil
	}

	var totalDiffPixels int64
	var totalPixels int64
	threshold := colorThreshold * 255.0

	for i := 0; i < frames; i++ {
		var bImg, lImg image.Image

		if i < len(bGIF.Image) {
			bImg = bGIF.Image[i]
		}
		if i < len(lGIF.Image) {
			lImg = lGIF.Image[i]
		}

		var bBounds, lBounds image.Rectangle
		if bImg != nil {
			bBounds = bImg.Bounds()
		}
		if lImg != nil {
			lBounds = lImg.Bounds()
		}

		width := bBounds.Dx()
		height := bBounds.Dy()
		if lBounds.Dx() > width {
			width = lBounds.Dx()
		}
		if lBounds.Dy() > height {
			height = lBounds.Dy()
		}

		totalPixels += int64(width * height)

		for y := 0; y < height; y++ {
			for x := 0; x < width; x++ {
				var bR, bG, bB, bA uint32
				var lR, lG, lB, lA uint32

				if bImg != nil && x < bBounds.Dx() && y < bBounds.Dy() {
					bR, bG, bB, bA = bImg.At(x+bBounds.Min.X, y+bBounds.Min.Y).RGBA()
				}
				if lImg != nil && x < lBounds.Dx() && y < lBounds.Dy() {
					lR, lG, lB, lA = lImg.At(x+lBounds.Min.X, y+lBounds.Min.Y).RGBA()
				}

				br, bg, bb, ba := float64(bR>>8), float64(bG>>8), float64(bB>>8), float64(bA>>8)
				lr, lg, lb, la := float64(lR>>8), float64(lG>>8), float64(lB>>8), float64(lA>>8)

				diff := math.Abs(br-lr) + math.Abs(bg-lg) + math.Abs(bb-lb) + math.Abs(ba-la)

				if diff > threshold*4 {
					totalDiffPixels++
				}
			}
		}
	}

	if totalPixels == 0 {
		return 0, nil
	}

	diffPercentage := float64(totalDiffPixels) / float64(totalPixels)

	if diffPercentage > 0 {
		diffFilename := ToDiffFilename(latestFile)
		diffFileWithPercentage := ToDiffFileWithPercentage(diffFilename, diffPercentage)

		var finalWidth, finalHeight int
		for _, img := range bGIF.Image {
			if img.Bounds().Dx() > finalWidth {
				finalWidth = img.Bounds().Dx()
			}
			if img.Bounds().Dy() > finalHeight {
				finalHeight = img.Bounds().Dy()
			}
		}
		for _, img := range lGIF.Image {
			if img.Bounds().Dx() > finalWidth {
				finalWidth = img.Bounds().Dx()
			}
			if img.Bounds().Dy() > finalHeight {
				finalHeight = img.Bounds().Dy()
			}
		}

		if finalWidth == 0 {
			finalWidth = 1
		}
		if finalHeight == 0 {
			finalHeight = 1
		}

		diffImg := image.NewRGBA(image.Rect(0, 0, finalWidth, finalHeight))
		for x := 0; x < finalWidth; x++ {
			for y := 0; y < finalHeight; y++ {
				diffImg.Set(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
			}
		}
		writePNG(diffFileWithPercentage, diffImg)
	}

	return diffPercentage, nil
}
