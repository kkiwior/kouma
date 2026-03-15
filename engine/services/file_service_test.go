package services

import (
	"kouma-engine/config"
	"kouma-engine/utils"
	"os"
	"path/filepath"
	"testing"
)

func TestCreateNewProjectFolders(t *testing.T) {
	tmpDir := t.TempDir()

	originalExchangeRootDir := config.ExchangeRootDir
	defer func() {
		config.ExchangeRootDir = originalExchangeRootDir
	}()

	config.ExchangeRootDir = tmpDir
	projectName := "test_project"
	err := CreateNewProjectFolders(projectName)

	if err != nil {
		t.Fatalf("CreateNewProjectFolders returned error: %v", err)
	}

	baseline, builds, latest := config.ProjectInitializeFolders(projectName)

	foldersToCheck := []string{
		filepath.Join(tmpDir, baseline),
		filepath.Join(tmpDir, builds),
		filepath.Join(tmpDir, latest),
	}

	for _, folder := range foldersToCheck {
		if !utils.IsProjectExist(folder) {
			t.Errorf("Expected folder to be created, but it does not exist: %s", folder)
		}
	}
}

func TestCreateNewProjectFolders_Error(t *testing.T) {
	tmpDir := t.TempDir()
	originalExchangeRootDir := config.ExchangeRootDir
	defer func() {
		config.ExchangeRootDir = originalExchangeRootDir
	}()

	fakeFile := filepath.Join(tmpDir, "not_a_dir")
	f, err := os.Create(fakeFile)
	if err != nil {
		t.Fatalf("Failed to create file: %v", err)
	}
	f.Close()

	config.ExchangeRootDir = fakeFile
	projectName := "test_error_project"
	err = CreateNewProjectFolders(projectName)

	if err == nil {
		t.Fatalf("CreateNewProjectFolders expected error, got nil")
	}
}

func TestCheckProjectExist(t *testing.T) {
	tmpDir := t.TempDir()
	originalExchangeRootDir := config.ExchangeRootDir
	defer func() {
		config.ExchangeRootDir = originalExchangeRootDir
	}()

	config.ExchangeRootDir = tmpDir

	projectName := "test_existing_project"

	if CheckProjectExist(projectName) {
		t.Errorf("CheckProjectExist returned true for non-existent project")
	}

	err := CreateNewProjectFolders(projectName)
	if err != nil {
		t.Fatalf("CreateNewProjectFolders failed: %v", err)
	}

	if !CheckProjectExist(projectName) {
		t.Errorf("CheckProjectExist returned false for existing project")
	}
}
