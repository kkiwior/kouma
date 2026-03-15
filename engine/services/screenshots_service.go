package services

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"kouma-engine/config"
	"kouma-engine/utils"
)

type CaseInfo struct {
	CaseName       string
	LatestPath     string
	BaselinePath   string
	DiffPath       string
	DiffPercentage *float64
}

func buildDirectory(buildIndex int) string {
	return fmt.Sprintf("build_%d", buildIndex)
}

func projectSharedPaths(projectName string) (baselinePath, buildsPath, latestPath string, err error) {
	sharedRoot, err := GetSharedProjectRootPath(projectName)
	if err != nil || sharedRoot == "" {
		return "", "", "", fmt.Errorf("can't find sharedProjectRootPath for project %q", projectName)
	}

	baselinePath = filepath.Join(sharedRoot, "baseline")
	buildsPath = filepath.Join(sharedRoot, "builds")
	latestPath = filepath.Join(sharedRoot, "latest")
	return
}

func MoveInTestScreenshots(projectName string) error {
	localLatest := config.LocalTestScreenshotsLatestPath(projectName)
	if err := utils.ClearDirectory(localLatest); err != nil {
		return err
	}

	_, _, sharedLatest, err := projectSharedPaths(projectName)
	if err != nil {
		return err
	}

	if err := utils.MoveFiles(sharedLatest, localLatest, "testToLatest"); err != nil {
		return err
	}
	return utils.ClearDirectory(sharedLatest)
}

func MoveInBaseline(projectName string) error {
	localBaseline := config.LocalTestScreenshotsBaselinePath(projectName)
	if err := utils.ClearDirectory(localBaseline); err != nil {
		return err
	}

	sharedBaseline, _, _, err := projectSharedPaths(projectName)
	if err != nil {
		return err
	}

	return utils.MoveFiles(sharedBaseline, localBaseline, "")
}

func MoveToBuilds(projectName string, buildIndex int) error {
	sharedBaseline, sharedBuilds, _, err := projectSharedPaths(projectName)
	if err != nil {
		return err
	}

	buildPath := filepath.Join(sharedBuilds, buildDirectory(buildIndex))
	if err := utils.CreateDirectory(buildPath); err != nil {
		return err
	}

	localLatest := config.LocalTestScreenshotsLatestPath(projectName)
	if err := utils.MoveFiles(localLatest, buildPath, ""); err != nil {
		return err
	}

	return utils.MoveInBaselineFilesAccordingToLatestFiles(sharedBaseline, buildPath)
}

func LocalTestCaseScreenshots(projectName string) ([]string, error) {
	return utils.ListFiles(config.LocalTestScreenshotsLatestPath(projectName))
}

func LocalBaselineScreenshots(projectName string) ([]string, error) {
	return utils.ListFiles(config.LocalTestScreenshotsBaselinePath(projectName))
}

func WithBaselineScreenshots(projectName, latestScreenshot string) (string, error) {
	baselines, err := LocalBaselineScreenshots(projectName)
	if err != nil {
		return "", err
	}

	for _, baseline := range baselines {
		if utils.IsLinkedLatestAndBaseline(latestScreenshot, baseline) {
			return baseline, nil
		}
	}
	return "", nil
}

func AllCasesInBuild(projectName string, buildIndex int) (map[string]*CaseInfo, error) {
	_, sharedBuilds, _, err := projectSharedPaths(projectName)
	if err != nil {
		return nil, err
	}

	buildPath := filepath.Join(sharedBuilds, buildDirectory(buildIndex))
	allPngs, err := utils.ListFilesNoPath(buildPath)
	if err != nil {
		return nil, err
	}

	cases := make(map[string]*CaseInfo)
	diffRegex := regexp.MustCompile(`(\S+)\.(\d+)\.diff\.png`)

	for _, filename := range allPngs {
		ext := filepath.Ext(filename)

		if match := diffRegex.FindStringSubmatch(filename); match != nil {
			caseBaseName := match[1]
			if _, ok := cases[caseBaseName]; !ok {
				cases[caseBaseName] = &CaseInfo{}
			}

			if cases[caseBaseName].CaseName == "" {
				cases[caseBaseName].CaseName = utils.ToCaseName(filename)
			}
			cases[caseBaseName].DiffPath = filepath.Join(buildPath, filename)
			pct := utils.PercentageFromDiffFile(filename)
			cases[caseBaseName].DiffPercentage = &pct
		} else if strings.Contains(filename, ".latest"+ext) {
			caseBaseName := strings.TrimSuffix(filename, ".latest"+ext)

			if _, ok := cases[caseBaseName]; !ok {
				cases[caseBaseName] = &CaseInfo{}
			}

			cases[caseBaseName].CaseName = utils.ToCaseName(filename)
			cases[caseBaseName].LatestPath = filepath.Join(buildPath, filename)
		} else if strings.Contains(filename, ".baseline"+ext) {
			caseBaseName := strings.TrimSuffix(filename, ".baseline"+ext)

			if _, ok := cases[caseBaseName]; !ok {
				cases[caseBaseName] = &CaseInfo{}
			}

			if cases[caseBaseName].CaseName == "" {
				cases[caseBaseName].CaseName = utils.ToCaseName(filename)
			}
			cases[caseBaseName].BaselinePath = filepath.Join(buildPath, filename)
		}
	}

	for _, caseInfo := range cases {
		if caseInfo.LatestPath != "" && caseInfo.BaselinePath != "" && caseInfo.DiffPercentage == nil {
			zero := 0.0
			caseInfo.DiffPercentage = &zero
		}
	}

	return cases, nil
}

func CreateScreenshotsRootDirectory(projectName string) {
	utils.CreateDirectory(config.LocalTestScreenshots(projectName))
	utils.CreateDirectory(config.LocalTestScreenshotsLatestPath(projectName))
	utils.CreateDirectory(config.LocalTestScreenshotsBaselinePath(projectName))
}

func MoveInTestScreenshotsFromStaging(projectName, bid string) error {
	localLatest := config.LocalTestScreenshotsLatestPath(projectName)
	if err := utils.ClearDirectory(localLatest); err != nil {
		return err
	}

	stagingPath := config.ProjectBuildStagingPath(projectName, bid)

	if err := utils.MoveFiles(stagingPath, localLatest, "testToLatest"); err != nil {
		return err
	}
	return os.RemoveAll(stagingPath)
}

func IsUploadedScreenshotValid(screenshotFilename string) bool {
	return utils.ScreenshotFilenameFilter(screenshotFilename)
}
