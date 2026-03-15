package services

import (
	"kouma-engine/config"
	"kouma-engine/utils"
	"path/filepath"
)

func CreateNewProjectFolders(projectName string) error {
	baseline, builds, latest := config.ProjectInitializeFolders(projectName)

	if err := utils.CreateDirectory(filepath.Join(config.ExchangeRootDir, baseline)); err != nil {
		return err
	}
	if err := utils.CreateDirectory(filepath.Join(config.ExchangeRootDir, builds)); err != nil {
		return err
	}
	return utils.CreateDirectory(filepath.Join(config.ExchangeRootDir, latest))
}

func CheckProjectExist(projectName string) bool {
	_, _, latest := config.ProjectInitializeFolders(projectName)
	return utils.IsProjectExist(filepath.Join(config.ExchangeRootDir, latest))
}
