package services

import (
	"kouma-engine/config"
	"kouma-engine/utils"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/integration/mtest"
)

func TestIsUploadedScreenshotValid(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		want     bool
	}{
		{
			name:     "valid simple name",
			filename: "valid-name.png",
			want:     true,
		},
		{
			name:     "valid complex name",
			filename: "valid_NAME-123&()#.png",
			want:     true,
		},
		{
			name:     "wrong extension",
			filename: "not-png.txt",
			want:     false,
		},
		{
			name:     "missing extension",
			filename: "no-extension",
			want:     false,
		},
		{
			name:     "too long name",
			filename: strings.Repeat("a", 252) + ".png", 
			want:     false,
		},
		{
			name:     "exactly max length name",
			filename: strings.Repeat("a", 251) + ".png", 
			want:     true,
		},
		{
			name:     "invalid character exclamation",
			filename: "invalid!.png",
			want:     true,
		},
		{
			name:     "invalid character space",
			filename: "space in name.png",
			want:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsUploadedScreenshotValid(tt.filename); got != tt.want {
				t.Errorf("IsUploadedScreenshotValid(%q) = %v, want %v", tt.filename, got, tt.want)
			}
		})
	}
}

func TestBuildDirectory(t *testing.T) {
	result := buildDirectory(1)
	if result != "build_1" {
		t.Errorf("buildDirectory(1) = %q, want %q", result, "build_1")
	}
	result = buildDirectory(42)
	if result != "build_42" {
		t.Errorf("buildDirectory(42) = %q, want %q", result, "build_42")
	}
}

func TestCreateScreenshotsRootDirectory(t *testing.T) {
	dir := t.TempDir()

	origExchange := config.ExchangeRootDir
	defer func() { config.ExchangeRootDir = origExchange }()

	oldWd, _ := os.Getwd()
	os.Chdir(dir)
	defer os.Chdir(oldWd)

	CreateScreenshotsRootDirectory("testproject")

	if !utils.IsProjectExist(filepath.Join("screenshots", "testproject")) {
		t.Error("expected screenshots/testproject to exist")
	}
	if !utils.IsProjectExist(filepath.Join("screenshots", "testproject", "latest")) {
		t.Error("expected screenshots/testproject/latest to exist")
	}
	if !utils.IsProjectExist(filepath.Join("screenshots", "testproject", "baseline")) {
		t.Error("expected screenshots/testproject/baseline to exist")
	}
}

func TestLocalTestCaseScreenshots(t *testing.T) {
	dir := t.TempDir()
	oldWd, _ := os.Getwd()
	os.Chdir(dir)
	defer os.Chdir(oldWd)

	latestDir := filepath.Join("screenshots", "testproject", "latest")
	os.MkdirAll(latestDir, 0755)
	os.WriteFile(filepath.Join(latestDir, "login.latest.png"), []byte("img"), 0644)
	os.WriteFile(filepath.Join(latestDir, "header.latest.png"), []byte("img"), 0644)

	files, err := LocalTestCaseScreenshots("testproject")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(files) != 2 {
		t.Errorf("expected 2 files, got %d", len(files))
	}
}

func TestLocalBaselineScreenshots(t *testing.T) {
	dir := t.TempDir()
	oldWd, _ := os.Getwd()
	os.Chdir(dir)
	defer os.Chdir(oldWd)

	baselineDir := filepath.Join("screenshots", "testproject", "baseline")
	os.MkdirAll(baselineDir, 0755)
	os.WriteFile(filepath.Join(baselineDir, "login.baseline.png"), []byte("img"), 0644)

	files, err := LocalBaselineScreenshots("testproject")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(files) != 1 {
		t.Errorf("expected 1 file, got %d", len(files))
	}
}

func TestWithBaselineScreenshots(t *testing.T) {
	dir := t.TempDir()
	oldWd, _ := os.Getwd()
	os.Chdir(dir)
	defer os.Chdir(oldWd)

	baselineDir := filepath.Join("screenshots", "testproject", "baseline")
	os.MkdirAll(baselineDir, 0755)
	os.WriteFile(filepath.Join(baselineDir, "login.baseline.png"), []byte("img"), 0644)

	latestDir := filepath.Join("screenshots", "testproject", "latest")
	os.MkdirAll(latestDir, 0755)
	
	result, err := WithBaselineScreenshots("testproject", filepath.Join(latestDir, "login.latest.png"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == "" {
		t.Error("expected matching baseline, got empty string")
	}
	
	result, err = WithBaselineScreenshots("testproject", filepath.Join(latestDir, "unknown.latest.png"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "" {
		t.Errorf("expected empty string for unmatched baseline, got %q", result)
	}
}

func TestWithBaselineScreenshots_Error(t *testing.T) {
	dir := t.TempDir()
	oldWd, _ := os.Getwd()
	os.Chdir(dir)
	defer os.Chdir(oldWd)
	
	_, err := WithBaselineScreenshots("nonexistent", "some.latest.png")
	if err == nil {
		t.Error("expected error for non-existent baseline directory")
	}
}

func TestAllCasesInBuild(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("parses build directory with diff files", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		tmpDir := t.TempDir()
		sharedRoot := filepath.Join(tmpDir, "shared")
		buildPath := filepath.Join(sharedRoot, "builds", "build_1")
		os.MkdirAll(buildPath, 0755)
		
		os.WriteFile(filepath.Join(buildPath, "login.latest.png"), []byte("img"), 0644)
		os.WriteFile(filepath.Join(buildPath, "login.baseline.png"), []byte("img"), 0644)
		os.WriteFile(filepath.Join(buildPath, "login.12345678.diff.png"), []byte("img"), 0644)
		os.WriteFile(filepath.Join(buildPath, "header.latest.png"), []byte("img"), 0644)
		
		mt.AddMockResponses(mtest.CreateCursorResponse(1, "micoo.projects", mtest.FirstBatch, bson.D{
			{Key: "projectName", Value: "testproject"},
			{Key: "sharedProjectRootPath", Value: sharedRoot},
		}))

		cases, err := AllCasesInBuild("testproject", 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(cases) != 2 {
			t.Fatalf("expected 2 cases, got %d", len(cases))
		}

		loginCase := cases["login"]
		if loginCase == nil {
			t.Fatal("expected login case to exist")
		}
		if loginCase.CaseName != "login.png" {
			t.Errorf("expected login.png, got %s", loginCase.CaseName)
		}
		if loginCase.DiffPercentage == nil {
			t.Error("expected DiffPercentage to be set")
		}
		if loginCase.DiffPath == "" {
			t.Error("expected DiffPath to be set")
		}

		headerCase := cases["header"]
		if headerCase == nil {
			t.Fatal("expected header case to exist")
		}
		if headerCase.DiffPercentage != nil {
			t.Error("expected DiffPercentage to be nil for undetermined case")
		}
	})
}

func TestProjectSharedPaths_Error(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("error from DB", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "db error",
		}))

		_, _, _, err := projectSharedPaths("testproject")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestMoveInTestScreenshots(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		dir := t.TempDir()
		oldWd, _ := os.Getwd()
		os.Chdir(dir)
		defer os.Chdir(oldWd)
		
		localLatest := filepath.Join("screenshots", "testproject", "latest")
		os.MkdirAll(localLatest, 0755)
		
		sharedRoot := filepath.Join(dir, "shared")
		sharedLatest := filepath.Join(sharedRoot, "latest")
		os.MkdirAll(sharedLatest, 0755)
		os.WriteFile(filepath.Join(sharedLatest, "login.png"), []byte("img"), 0644)

		mt.AddMockResponses(mtest.CreateCursorResponse(1, "micoo.projects", mtest.FirstBatch, bson.D{
			{Key: "projectName", Value: "testproject"},
			{Key: "sharedProjectRootPath", Value: sharedRoot},
		}))

		err := MoveInTestScreenshots("testproject")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		
		files, _ := utils.ListFiles(localLatest)
		if len(files) != 1 {
			t.Errorf("expected 1 file in local latest, got %d", len(files))
		}
	})
}

func TestMoveInBaseline(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		dir := t.TempDir()
		oldWd, _ := os.Getwd()
		os.Chdir(dir)
		defer os.Chdir(oldWd)
		
		localBaseline := filepath.Join("screenshots", "testproject", "baseline")
		os.MkdirAll(localBaseline, 0755)
		
		sharedRoot := filepath.Join(dir, "shared")
		sharedBaseline := filepath.Join(sharedRoot, "baseline")
		os.MkdirAll(sharedBaseline, 0755)
		os.WriteFile(filepath.Join(sharedBaseline, "login.baseline.png"), []byte("img"), 0644)

		mt.AddMockResponses(mtest.CreateCursorResponse(1, "micoo.projects", mtest.FirstBatch, bson.D{
			{Key: "projectName", Value: "testproject"},
			{Key: "sharedProjectRootPath", Value: sharedRoot},
		}))

		err := MoveInBaseline("testproject")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		files, _ := utils.ListFiles(localBaseline)
		if len(files) != 1 {
			t.Errorf("expected 1 file in local baseline, got %d", len(files))
		}
	})
}

func TestMoveToBuilds(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		dir := t.TempDir()
		oldWd, _ := os.Getwd()
		os.Chdir(dir)
		defer os.Chdir(oldWd)
		
		localLatest := filepath.Join("screenshots", "testproject", "latest")
		os.MkdirAll(localLatest, 0755)
		os.WriteFile(filepath.Join(localLatest, "login.latest.png"), []byte("img"), 0644)
		
		sharedRoot := filepath.Join(dir, "shared")
		sharedBaseline := filepath.Join(sharedRoot, "baseline")
		sharedBuilds := filepath.Join(sharedRoot, "builds")
		os.MkdirAll(sharedBaseline, 0755)
		os.MkdirAll(sharedBuilds, 0755)

		mt.AddMockResponses(mtest.CreateCursorResponse(1, "micoo.projects", mtest.FirstBatch, bson.D{
			{Key: "projectName", Value: "testproject"},
			{Key: "sharedProjectRootPath", Value: sharedRoot},
		}))

		err := MoveToBuilds("testproject", 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		buildPath := filepath.Join(sharedBuilds, "build_1")
		if !utils.IsProjectExist(buildPath) {
			t.Error("expected build directory to exist")
		}
	})
}

func TestMoveInTestScreenshots_ClearError(t *testing.T) {
	dir := t.TempDir()
	oldWd, _ := os.Getwd()
	os.Chdir(dir)
	defer os.Chdir(oldWd)

	err := MoveInTestScreenshots("nonexistent-project")
	if err == nil {
		t.Error("expected error when local latest dir doesn't exist")
	}
}

func TestMoveInBaseline_ClearError(t *testing.T) {
	dir := t.TempDir()
	oldWd, _ := os.Getwd()
	os.Chdir(dir)
	defer os.Chdir(oldWd)

	err := MoveInBaseline("nonexistent-project")
	if err == nil {
		t.Error("expected error when local baseline dir doesn't exist")
	}
}

func TestMoveInTestScreenshots_SharedPathError(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("shared path error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		dir := t.TempDir()
		oldWd, _ := os.Getwd()
		os.Chdir(dir)
		defer os.Chdir(oldWd)

		localLatest := filepath.Join("screenshots", "testproject", "latest")
		os.MkdirAll(localLatest, 0755)

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "db error",
		}))

		err := MoveInTestScreenshots("testproject")
		if err == nil {
			t.Error("expected error from shared path lookup")
		}
	})
}

func TestMoveInBaseline_SharedPathError(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("shared path error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		dir := t.TempDir()
		oldWd, _ := os.Getwd()
		os.Chdir(dir)
		defer os.Chdir(oldWd)

		localBaseline := filepath.Join("screenshots", "testproject", "baseline")
		os.MkdirAll(localBaseline, 0755)

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "db error",
		}))

		err := MoveInBaseline("testproject")
		if err == nil {
			t.Error("expected error from shared path lookup")
		}
	})
}

func TestAllCasesInBuild_WithBaselineFiles(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("baseline and diff files are skipped", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		tmpDir := t.TempDir()
		sharedRoot := filepath.Join(tmpDir, "shared")
		buildPath := filepath.Join(sharedRoot, "builds", "build_1")
		os.MkdirAll(buildPath, 0755)

		os.WriteFile(filepath.Join(buildPath, "login.latest.png"), []byte("img"), 0644)
		os.WriteFile(filepath.Join(buildPath, "login.baseline.png"), []byte("img"), 0644)
		os.WriteFile(filepath.Join(buildPath, "old.diff.png"), []byte("img"), 0644)

		mt.AddMockResponses(mtest.CreateCursorResponse(1, "micoo.projects", mtest.FirstBatch, bson.D{
			{Key: "projectName", Value: "testproject"},
			{Key: "sharedProjectRootPath", Value: sharedRoot},
		}))

		cases, err := AllCasesInBuild("testproject", 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(cases) != 1 {
			t.Fatalf("expected 1 case, got %d", len(cases))
		}
		if _, ok := cases["login"]; !ok {
			t.Error("expected 'login' case")
		}
	})
}

func TestAllCasesInBuild_Error(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("shared path error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "db error",
		}))

		_, err := AllCasesInBuild("testproject", 1)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestMoveToBuilds_MoveError(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("move files error (nonexistent local latest)", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		dir := t.TempDir()
		oldWd, _ := os.Getwd()
		os.Chdir(dir)
		defer os.Chdir(oldWd)

		sharedRoot := filepath.Join(dir, "shared")
		sharedBaseline := filepath.Join(sharedRoot, "baseline")
		sharedBuilds := filepath.Join(sharedRoot, "builds")
		os.MkdirAll(sharedBaseline, 0755)
		os.MkdirAll(sharedBuilds, 0755)

		mt.AddMockResponses(mtest.CreateCursorResponse(1, "micoo.projects", mtest.FirstBatch, bson.D{
			{Key: "projectName", Value: "testproject"},
			{Key: "sharedProjectRootPath", Value: sharedRoot},
		}))

		err := MoveToBuilds("testproject", 1)
		if err == nil {
			t.Error("expected error from MoveFiles with non-existent source")
		}
	})
}
