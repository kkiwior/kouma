package services

import (
	"kouma-engine/config"
	"kouma-engine/models"
	"kouma-engine/utils"
	"os"
	"strings"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/integration/mtest"
)

func TestMain(m *testing.M) {
	config.Init()
	os.Exit(m.Run())
}

func TestGetProjectAPIKey_Success(t *testing.T) {
	originalKey := "AKtestkey1234567890a"

	encrypted, err := utils.EncryptAPIKey(originalKey)
	if err != nil {
		t.Fatalf("utils.EncryptAPIKey failed: %v", err)
	}

	project := &models.Project{
		APIKey: encrypted,
	}

	decrypted, err := GetProjectAPIKey(project)
	if err != nil {
		t.Fatalf("GetProjectAPIKey failed: %v", err)
	}

	if decrypted != originalKey {
		t.Errorf("GetProjectAPIKey() = %q, want %q", decrypted, originalKey)
	}
}

func TestGetProjectAPIKey_Error(t *testing.T) {
	project := &models.Project{
		APIKey: "invalid_key_format",
	}

	_, err := GetProjectAPIKey(project)
	if err == nil {
		t.Error("Expected GetProjectAPIKey to fail with invalid format API key, got nil error")
	}
}

func TestGetProjectByPID(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(mtest.CreateCursorResponse(1, "micoo.projects", mtest.FirstBatch, bson.D{
			{Key: "pid", Value: "pid-123"},
			{Key: "projectName", Value: "myproject"},
		}))

		project, err := GetProjectByPID("pid-123")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if project.PID != "pid-123" {
			t.Errorf("expected pid pid-123, got %s", project.PID)
		}
		if project.ProjectName != "myproject" {
			t.Errorf("expected projectName myproject, got %s", project.ProjectName)
		}
	})

	mt.Run("not found", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "not found",
		}))

		_, err := GetProjectByPID("pid-404")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if !strings.Contains(err.Error(), "finding project by pid=pid-404") {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

func TestGetSharedProjectRootPath(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(mtest.CreateCursorResponse(1, "micoo.projects", mtest.FirstBatch, bson.D{
			{Key: "projectName", Value: "myproject"},
			{Key: "sharedProjectRootPath", Value: "/shared/path"},
		}))

		path, err := GetSharedProjectRootPath("myproject")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if path != "/shared/path" {
			t.Errorf("expected /shared/path, got %s", path)
		}
	})

	mt.Run("not found", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "not found",
		}))

		_, err := GetSharedProjectRootPath("nonexistent")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}
