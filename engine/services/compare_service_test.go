package services

import (
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"testing"

	"kouma-engine/models"
	"kouma-engine/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/integration/mtest"
)

func TestNewWorkerPool(t *testing.T) {
	pool := NewWorkerPool(4)
	if pool.maxWorkers != 4 {
		t.Errorf("expected maxWorkers 4, got %d", pool.maxWorkers)
	}
	if cap(pool.sem) != 4 {
		t.Errorf("expected sem capacity 4, got %d", cap(pool.sem))
	}
}

func TestNewWorkerPool_One(t *testing.T) {
	pool := NewWorkerPool(1)
	if pool.maxWorkers != 1 {
		t.Errorf("expected maxWorkers 1, got %d", pool.maxWorkers)
	}
}

func TestDetermineBuildResult_AllPassed(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("all passed", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		first := mtest.CreateCursorResponse(1, "micoo.cases", mtest.FirstBatch, bson.D{
			{Key: "bid", Value: "bid-1"},
			{Key: "pid", Value: "pid-1"},
			{Key: "caseResult", Value: "passed"},
		})
		second := mtest.CreateCursorResponse(1, "micoo.cases", mtest.NextBatch, bson.D{
			{Key: "bid", Value: "bid-1"},
			{Key: "pid", Value: "pid-1"},
			{Key: "caseResult", Value: "passed"},
		})
		killCursors := mtest.CreateCursorResponse(0, "micoo.cases", mtest.NextBatch)
		updateResp := mtest.CreateSuccessResponse()

		mt.AddMockResponses(first, second, killCursors, updateResp)

		result, count, err := determineBuildResult("bid-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != "passed" {
			t.Errorf("expected 'passed', got %q", result)
		}
		if count != 2 {
			t.Errorf("expected count 2, got %d", count)
		}
	})
}

func TestDetermineBuildResult_WithUndetermined(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("undetermined cases", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		first := mtest.CreateCursorResponse(1, "micoo.cases", mtest.FirstBatch, bson.D{
			{Key: "bid", Value: "bid-1"},
			{Key: "pid", Value: "pid-1"},
			{Key: "caseResult", Value: "undetermined"},
		})
		killCursors := mtest.CreateCursorResponse(0, "micoo.cases", mtest.NextBatch)
		updateResp := mtest.CreateSuccessResponse()

		mt.AddMockResponses(first, killCursors, updateResp)

		result, _, err := determineBuildResult("bid-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != "undetermined" {
			t.Errorf("expected 'undetermined', got %q", result)
		}
	})
}

func TestDetermineBuildResult_Failed(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("failed cases", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		first := mtest.CreateCursorResponse(1, "micoo.cases", mtest.FirstBatch, bson.D{
			{Key: "bid", Value: "bid-1"},
			{Key: "pid", Value: "pid-1"},
			{Key: "caseResult", Value: "failed"},
		})
		killCursors := mtest.CreateCursorResponse(0, "micoo.cases", mtest.NextBatch)
		updateResp := mtest.CreateSuccessResponse()

		mt.AddMockResponses(first, killCursors, updateResp)

		result, _, err := determineBuildResult("bid-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != "failed" {
			t.Errorf("expected 'failed', got %q", result)
		}
	})
}

func TestDetermineBuildResult_FailedWithIgnoring(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("failed but all ignored (passed by ignoring)", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		passedResult := "passed"
		first := mtest.CreateCursorResponse(1, "micoo.cases", mtest.FirstBatch, bson.D{
			{Key: "bid", Value: "bid-1"},
			{Key: "pid", Value: "pid-1"},
			{Key: "caseResult", Value: "failed"},
			{Key: "comprehensiveCaseResult", Value: passedResult},
		})
		killCursors := mtest.CreateCursorResponse(0, "micoo.cases", mtest.NextBatch)
		updateResp := mtest.CreateSuccessResponse()

		mt.AddMockResponses(first, killCursors, updateResp)

		result, _, err := determineBuildResult("bid-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result != "passed" {
			t.Errorf("expected 'passed' (ignoring covers failed), got %q", result)
		}
	})
}

func TestDetermineBuildResult_GetCasesError(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("get cases error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "find error",
		}))

		_, _, err := determineBuildResult("bid-1")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestDetermineBuildResult_UpdateError(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("update count error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		first := mtest.CreateCursorResponse(1, "micoo.cases", mtest.FirstBatch, bson.D{
			{Key: "bid", Value: "bid-1"},
			{Key: "pid", Value: "pid-1"},
			{Key: "caseResult", Value: "passed"},
		})
		killCursors := mtest.CreateCursorResponse(0, "micoo.cases", mtest.NextBatch)
		updateError := mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "update error",
		})

		mt.AddMockResponses(first, killCursors, updateError)

		_, _, err := determineBuildResult("bid-1")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestUpdateBuild(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		first := mtest.CreateCursorResponse(1, "micoo.cases", mtest.FirstBatch, bson.D{
			{Key: "bid", Value: "bid-1"},
			{Key: "pid", Value: "pid-1"},
			{Key: "caseResult", Value: "passed"},
		})

		killCursors := mtest.CreateCursorResponse(0, "micoo.cases", mtest.NextBatch)
		updateCountResp := mtest.CreateSuccessResponse()
		finalizeResp := mtest.CreateSuccessResponse()

		mt.AddMockResponses(first, killCursors, updateCountResp, finalizeResp)

		err := updateBuild("bid-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	mt.Run("determineBuildResult error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "error",
		}))

		err := updateBuild("bid-1")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestGenerateBuildArtifacts(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("error from MoveToBuilds", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "db error",
		}))

		err := generateBuildArtifacts("testproject", 1)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestCheckAndHandleIgnoring_NoCases(t *testing.T) {
	project := &models.Project{PID: "pid-1"}
	build := &models.Build{BID: "bid-1"}

	err := checkAndHandleIgnoring(project, build, map[string]*CaseInfo{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCheckAndHandleIgnoring_ZeroDiff(t *testing.T) {
	project := &models.Project{PID: "pid-1"}
	build := &models.Build{BID: "bid-1"}

	zeroDiff := 0.0
	cases := map[string]*CaseInfo{
		"login": {
			CaseName:       "login.png",
			DiffPercentage: &zeroDiff,
		},
	}

	err := checkAndHandleIgnoring(project, build, cases)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCheckAndHandleIgnoring_NilDiffPercentage(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("nil diff percentage - still queries ignorings", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		project := &models.Project{PID: "pid-1"}
		build := &models.Build{BID: "bid-1"}

		cases := map[string]*CaseInfo{
			"login": {
				CaseName:       "login.png",
				DiffPercentage: nil,
			},
		}

		mt.AddMockResponses(mtest.CreateCursorResponse(0, "micoo.ignorings", mtest.FirstBatch))

		err := checkAndHandleIgnoring(project, build, cases)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}

func TestCheckAndHandleIgnoring_WithNonZeroDiff_NoIgnoring(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("no ignoring found", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		project := &models.Project{PID: "pid-1"}
		build := &models.Build{BID: "bid-1"}

		diff := 0.5
		cases := map[string]*CaseInfo{
			"login": {
				CaseName:       "login.png",
				DiffPercentage: &diff,
			},
		}

		mt.AddMockResponses(mtest.CreateCursorResponse(0, "micoo.ignorings", mtest.FirstBatch))

		err := checkAndHandleIgnoring(project, build, cases)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}

func TestCheckAndHandleIgnoring_GetIgnoringsError(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("get ignorings error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		project := &models.Project{PID: "pid-1"}
		build := &models.Build{BID: "bid-1"}

		diff := 0.5
		cases := map[string]*CaseInfo{
			"login": {
				CaseName:       "login.png",
				DiffPercentage: &diff,
			},
		}

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "db error",
		}))

		err := checkAndHandleIgnoring(project, build, cases)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestGenerateCaseInDatabase(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success with single case", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		tmpDir := t.TempDir()
		sharedRoot := filepath.Join(tmpDir, "shared")
		buildPath := filepath.Join(sharedRoot, "builds", "build_1")
		os.MkdirAll(buildPath, 0755)
		os.WriteFile(filepath.Join(buildPath, "login.latest.png"), []byte("img"), 0644)

		mt.AddMockResponses(
			mtest.CreateCursorResponse(1, "micoo.projects", mtest.FirstBatch, bson.D{
				{Key: "projectName", Value: "testproject"},
				{Key: "sharedProjectRootPath", Value: sharedRoot},
			}),
			mtest.CreateSuccessResponse(),
			mtest.CreateSuccessResponse(),
		)

		cases, err := generateCaseInDatabase("pid-1", "testproject", "bid-1", 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(cases) != 1 {
			t.Errorf("expected 1 case, got %d", len(cases))
		}
	})

	mt.Run("AllCasesInBuild error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "db error",
		}))

		_, err := generateCaseInDatabase("pid-1", "testproject", "bid-1", 1)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	mt.Run("CreateCase error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		tmpDir := t.TempDir()
		sharedRoot := filepath.Join(tmpDir, "shared")
		buildPath := filepath.Join(sharedRoot, "builds", "build_1")
		os.MkdirAll(buildPath, 0755)

		os.WriteFile(filepath.Join(buildPath, "login.latest.png"), []byte("img"), 0644)

		mt.AddMockResponses(
			mtest.CreateCursorResponse(1, "micoo.projects", mtest.FirstBatch, bson.D{
				{Key: "projectName", Value: "testproject"},
				{Key: "sharedProjectRootPath", Value: sharedRoot},
			}),
			mtest.CreateCommandErrorResponse(mtest.CommandError{
				Code:    123,
				Message: "insert error",
			}),
		)

		_, err := generateCaseInDatabase("pid-1", "testproject", "bid-1", 1)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

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

func TestCheckAndHandleIgnoring_WithIgnoring_AllIgnored(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("ignoring covers all diffs - result passed", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		tmpDir := t.TempDir()
		baselinePath := filepath.Join(tmpDir, "login.baseline.png")
		latestPath := filepath.Join(tmpDir, "login.latest.png")

		createTestPNG(t, baselinePath, 10, 10, color.RGBA{R: 255, A: 255})
		latImg := image.NewRGBA(image.Rect(0, 0, 10, 10))
		for y := 0; y < 10; y++ {
			for x := 0; x < 10; x++ {
				if x < 5 {
					latImg.Set(x, y, color.RGBA{R: 255, A: 255})
				} else {
					latImg.Set(x, y, color.RGBA{G: 255, A: 255})
				}
			}
		}
		latF, _ := os.Create(latestPath)
		png.Encode(latF, latImg)
		latF.Close()

		project := &models.Project{
			PID:                        "pid-1",
			ProjectIgnoringCluster:     true,
			ProjectIgnoringClusterSize: 50,
		}
		build := &models.Build{BID: "bid-1"}

		diff := 0.5
		cases := map[string]*CaseInfo{
			"login": {
				CaseName:       "login.png",
				DiffPercentage: &diff,
				BaselinePath:   baselinePath,
				LatestPath:     latestPath,
			},
		}

		ignoringFirst := mtest.CreateCursorResponse(1, "micoo.ignorings", mtest.FirstBatch, bson.D{
			{Key: "pid", Value: "pid-1"},
			{Key: "caseName", Value: "login.png"},
			{Key: "rectangles", Value: bson.A{
				bson.D{
					{Key: "x", Value: 0},
					{Key: "y", Value: 0},
					{Key: "width", Value: 100},
					{Key: "height", Value: 100},
				},
			}},
		})
		ignoringKill := mtest.CreateCursorResponse(0, "micoo.ignorings", mtest.NextBatch)

		setIgnoringResp := mtest.CreateSuccessResponse()
		setResultResp := mtest.CreateSuccessResponse()

		mt.AddMockResponses(ignoringFirst, ignoringKill, setIgnoringResp, setResultResp)

		err := checkAndHandleIgnoring(project, build, cases)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}

func TestCheckAndHandleIgnoring_FindClustersError(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("FindDiffClusters error - continues", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		project := &models.Project{
			PID:                    "pid-1",
			ProjectIgnoringCluster: true,
		}
		build := &models.Build{BID: "bid-1"}

		diff := 0.5
		cases := map[string]*CaseInfo{
			"login": {
				CaseName:       "login.png",
				DiffPercentage: &diff,
				BaselinePath:   "/nonexistent/baseline.png",
				LatestPath:     "/nonexistent/latest.png",
			},
		}

		ignoringFirst := mtest.CreateCursorResponse(1, "micoo.ignorings", mtest.FirstBatch, bson.D{
			{Key: "pid", Value: "pid-1"},
			{Key: "caseName", Value: "login.png"},
			{Key: "rectangles", Value: bson.A{
				bson.D{
					{Key: "x", Value: 0},
					{Key: "y", Value: 0},
					{Key: "width", Value: 100},
					{Key: "height", Value: 100},
				},
			}},
		})
		ignoringKill := mtest.CreateCursorResponse(0, "micoo.ignorings", mtest.NextBatch)

		mt.AddMockResponses(ignoringFirst, ignoringKill)

		err := checkAndHandleIgnoring(project, build, cases)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}

func TestCheckAndHandleIgnoring_SetIgnoringError(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("SetIgnoringAndComprehensiveResult error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		tmpDir := t.TempDir()
		baselinePath := filepath.Join(tmpDir, "login.baseline.png")
		latestPath := filepath.Join(tmpDir, "login.latest.png")

		createTestPNG(t, baselinePath, 10, 10, color.RGBA{R: 255, A: 255})
		createTestPNG(t, latestPath, 10, 10, color.RGBA{G: 255, A: 255})

		project := &models.Project{
			PID:                        "pid-1",
			ProjectIgnoringCluster:     true,
			ProjectIgnoringClusterSize: 50,
		}
		build := &models.Build{BID: "bid-1"}

		diff := 0.5
		cases := map[string]*CaseInfo{
			"login": {
				CaseName:       "login.png",
				DiffPercentage: &diff,
				BaselinePath:   baselinePath,
				LatestPath:     latestPath,
			},
		}

		ignoringFirst := mtest.CreateCursorResponse(1, "micoo.ignorings", mtest.FirstBatch, bson.D{
			{Key: "pid", Value: "pid-1"},
			{Key: "caseName", Value: "login.png"},
			{Key: "rectangles", Value: bson.A{
				bson.D{
					{Key: "x", Value: 0},
					{Key: "y", Value: 0},
					{Key: "width", Value: 10},
					{Key: "height", Value: 10},
				},
			}},
		})
		ignoringKill := mtest.CreateCursorResponse(0, "micoo.ignorings", mtest.NextBatch)

		setResultErr := mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "update error",
		})

		mt.AddMockResponses(ignoringFirst, ignoringKill, setResultErr)

		err := checkAndHandleIgnoring(project, build, cases)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestCheckAndHandleIgnoring_SetResultError(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("SetIgnoringAndComprehensiveResult error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		tmpDir := t.TempDir()
		baselinePath := filepath.Join(tmpDir, "login.baseline.png")
		latestPath := filepath.Join(tmpDir, "login.latest.png")

		createTestPNG(t, baselinePath, 10, 10, color.RGBA{R: 255, A: 255})
		createTestPNG(t, latestPath, 10, 10, color.RGBA{G: 255, A: 255})

		project := &models.Project{
			PID:                        "pid-1",
			ProjectIgnoringCluster:     true,
			ProjectIgnoringClusterSize: 50,
		}
		build := &models.Build{BID: "bid-1"}

		diff := 0.5
		cases := map[string]*CaseInfo{
			"login": {
				CaseName:       "login.png",
				DiffPercentage: &diff,
				BaselinePath:   baselinePath,
				LatestPath:     latestPath,
			},
		}

		ignoringFirst := mtest.CreateCursorResponse(1, "micoo.ignorings", mtest.FirstBatch, bson.D{
			{Key: "pid", Value: "pid-1"},
			{Key: "caseName", Value: "login.png"},
			{Key: "rectangles", Value: bson.A{
				bson.D{
					{Key: "x", Value: 0},
					{Key: "y", Value: 0},
					{Key: "width", Value: 10},
					{Key: "height", Value: 10},
				},
			}},
		})
		ignoringKill := mtest.CreateCursorResponse(0, "micoo.ignorings", mtest.NextBatch)
		setResultErr := mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "update error",
		})

		mt.AddMockResponses(ignoringFirst, ignoringKill, setResultErr)

		err := checkAndHandleIgnoring(project, build, cases)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}
