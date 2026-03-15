package services

import (
	"fmt"
	"strings"
	"sync"

	"kouma-engine/models"
	"kouma-engine/utils"
)

type WorkerPool struct {
	maxWorkers int
	sem        chan struct{}
}

func NewWorkerPool(maxWorkers int) *WorkerPool {
	return &WorkerPool{
		maxWorkers: maxWorkers,
		sem:        make(chan struct{}, maxWorkers),
	}
}

func doCompare(projectName string, colorThreshold float64, detectAntialiasing bool) error {
	latestScreenshots, err := LocalTestCaseScreenshots(projectName)
	if err != nil {
		return fmt.Errorf("listing latest screenshots: %w", err)
	}

	pool := NewWorkerPool(4)
	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstErr error

	for _, latestScreenshot := range latestScreenshots {
		baselineScreenshot, err := WithBaselineScreenshots(projectName, latestScreenshot)
		if err != nil {
			return err
		}

		if baselineScreenshot != "" {
			utils.ProcessLogger(fmt.Sprintf(`FBI --> Info: to compare, baseline: "%s" -> latest: "%s"`,
				baselineScreenshot, latestScreenshot))

			wg.Add(1)
			pool.sem <- struct{}{} 

			go func(baseline, latest string) {
				defer wg.Done()
				defer func() { <-pool.sem }() 

				if err := utils.Compare(baseline, latest, colorThreshold, detectAntialiasing); err != nil {
					mu.Lock()
					if firstErr == nil {
						firstErr = err
					}
					mu.Unlock()
					utils.ProcessLogger(fmt.Sprintf("FBI --> Error: comparison failed: %v", err))
				}
			}(baselineScreenshot, latestScreenshot)
		} else {
			utils.ProcessLogger(fmt.Sprintf(`FBI --> Info: no baseline for latest: "%s"`, latestScreenshot))
		}
	}

	wg.Wait()
	return firstErr
}

func generateBuildArtifacts(projectName string, buildIndex int) error {
	return MoveToBuilds(projectName, buildIndex)
}

func generateCaseInDatabase(pid, projectName, bid string, buildIndex int) (map[string]*CaseInfo, error) {
	allCases, err := AllCasesInBuild(projectName, buildIndex)
	if err != nil {
		return nil, err
	}

	if err := CreateCases(pid, bid, allCases, 0); err != nil {
		return nil, err
	}

	return allCases, nil
}

func determineBuildResult(bid string) (string, int, error) {
	allCases, err := GetAllCasesInBuild(bid)
	if err != nil {
		return "", 0, err
	}

	caseCount := len(allCases)
	var pid string
	var passedCount, failedCount, undeterminedCount, passedByIgnoringCount int

	for _, tc := range allCases {
		pid = tc.PID

		switch tc.CaseResult {
		case "undetermined":
			undeterminedCount++
		case "failed":
			failedCount++
		case "passed":
			passedCount++
		}

		if tc.ComprehensiveCaseResult != nil && *tc.ComprehensiveCaseResult == "passed" {
			passedByIgnoringCount++
		}
	}

	if err := UpdateTestCaseCount(pid, bid, passedCount, failedCount, undeterminedCount, passedByIgnoringCount); err != nil {
		return "", 0, err
	}

	buildResult := "passed"
	if undeterminedCount > 0 {
		buildResult = "undetermined"
	} else if failedCount > passedByIgnoringCount {
		buildResult = "failed"
	}

	return buildResult, caseCount, nil
}

func updateBuild(bid string) error {
	buildResult, caseCount, err := determineBuildResult(bid)
	if err != nil {
		return err
	}
	return FinalizeBuild(bid, buildResult, caseCount)
}

func checkAndHandleIgnoring(project *models.Project, build *models.Build, createdCases map[string]*CaseInfo) error {
	var caseNames []string
	for _, compareCase := range createdCases {
		if compareCase.DiffPercentage != nil && *compareCase.DiffPercentage == 0 {
			continue
		}
		caseNames = append(caseNames, compareCase.CaseName)
	}

	var ignorings map[string]*PlainIgnoring
	var err error
	if len(caseNames) > 0 {
		ignorings, err = GetPlainIgnorings(project.PID, caseNames)
		if err != nil {
			return err
		}
	}

	for _, compareCase := range createdCases {
		if compareCase.DiffPercentage != nil && *compareCase.DiffPercentage == 0 {
			continue
		}

		ignoring := ignorings[compareCase.CaseName]

		if ignoring == nil {
			continue
		}

		clusters, err := utils.FindDiffClusters(
			compareCase.BaselinePath,
			compareCase.LatestPath,
			project.ProjectIgnoringCluster,
			project.ProjectIgnoringClusterSize,
		)
		if err != nil {
			utils.ProcessLogger(fmt.Sprintf("Error finding diff clusters: %v", err))
			continue
		}

		diffRectangles := make([]utils.Rectangle, len(clusters))
		for i, cluster := range clusters {
			diffRectangles[i] = utils.ClusterToRectangle(cluster)
		}

		ignoringRects := make([]utils.Rectangle, len(ignoring.Rectangles))
		for i, r := range ignoring.Rectangles {
			ignoringRects[i] = utils.Rectangle{
				X:      r.X,
				Y:      r.Y,
				Width:  r.Width,
				Height: r.Height,
			}
		}

		allIgnored := utils.IsRectanglesAllIgnored(ignoringRects, diffRectangles)

		result := "failed"
		if allIgnored {
			result = "passed"
		}

		if err := SetIgnoringAndComprehensiveResult(project.PID, build.BID, compareCase.CaseName, ignoring.Rectangles, result); err != nil {
			return err
		}
	}

	return nil
}

func ComprehensiveCompare(project *models.Project, build *models.Build) error {
	logHeader := fmt.Sprintf("PID=%s | BID=%s | ", project.PID, build.BID)
	projectName := strings.ToLower(project.ProjectName)

	utils.ProcessLogger(fmt.Sprintf("%s Start Comparing ...", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s create project compare root directory ...", logHeader))
	CreateScreenshotsRootDirectory(projectName)
	utils.ProcessLogger(fmt.Sprintf("%s create project compare root directory ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s moving in baseline ...", logHeader))
	if err := MoveInBaseline(projectName); err != nil {
		return fmt.Errorf("moving in baseline: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s moving in baseline ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s moving in test ...", logHeader))
	if err := MoveInTestScreenshots(projectName); err != nil {
		return fmt.Errorf("moving in test screenshots: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s moving in test ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s comparing ...", logHeader))
	if err := doCompare(projectName, project.ProjectColorThreshold, project.ProjectDetectAntialiasing); err != nil {
		return fmt.Errorf("comparing: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s comparing ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s generating build artifacts ...", logHeader))
	if err := generateBuildArtifacts(projectName, build.BuildIndex); err != nil {
		return fmt.Errorf("generating build artifacts: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s generating build artifacts ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s generating case in DB ...", logHeader))
	createdCases, err := generateCaseInDatabase(project.PID, projectName, build.BID, build.BuildIndex)
	if err != nil {
		return fmt.Errorf("generating cases in DB: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s generating case in DB ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s check and handle ignoring ...", logHeader))
	if err := checkAndHandleIgnoring(project, build, createdCases); err != nil {
		return fmt.Errorf("handling ignoring: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s check and handle ignoring ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s updating build ...", logHeader))
	if err := updateBuild(build.BID); err != nil {
		return fmt.Errorf("updating build: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s updating build ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s sending webhooks ...", logHeader))
	updatedBuild, err := GetBuildByBID(build.BID)
	if err != nil {
		utils.ProcessLogger(fmt.Sprintf("%s failed to get updated build for webhooks: %v", logHeader, err))
	} else {
		SendWebhooksForBuild(project.PID, updatedBuild, project)
	}
	utils.ProcessLogger(fmt.Sprintf("%s sending webhooks ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s Compare Done", logHeader))
	return nil
}

func ComprehensiveCompareStaged(project *models.Project, build *models.Build) error {
	logHeader := fmt.Sprintf("PID=%s | BID=%s | ", project.PID, build.BID)
	projectName := strings.ToLower(project.ProjectName)

	utils.ProcessLogger(fmt.Sprintf("%s Start Comparing (staged) ...", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s create project compare root directory ...", logHeader))
	CreateScreenshotsRootDirectory(projectName)
	utils.ProcessLogger(fmt.Sprintf("%s create project compare root directory ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s moving in baseline ...", logHeader))
	if err := MoveInBaseline(projectName); err != nil {
		return fmt.Errorf("moving in baseline: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s moving in baseline ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s moving in test from staging ...", logHeader))
	if err := MoveInTestScreenshotsFromStaging(projectName, build.BID); err != nil {
		return fmt.Errorf("moving in test screenshots from staging: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s moving in test from staging ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s comparing ...", logHeader))
	if err := doCompare(projectName, project.ProjectColorThreshold, project.ProjectDetectAntialiasing); err != nil {
		return fmt.Errorf("comparing: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s comparing ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s generating build artifacts ...", logHeader))
	if err := generateBuildArtifacts(projectName, build.BuildIndex); err != nil {
		return fmt.Errorf("generating build artifacts: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s generating build artifacts ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s generating case in DB ...", logHeader))
	createdCases, err := generateCaseInDatabase(project.PID, projectName, build.BID, build.BuildIndex)
	if err != nil {
		return fmt.Errorf("generating cases in DB: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s generating case in DB ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s check and handle ignoring ...", logHeader))
	if err := checkAndHandleIgnoring(project, build, createdCases); err != nil {
		return fmt.Errorf("handling ignoring: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s check and handle ignoring ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s updating build ...", logHeader))
	if err := updateBuild(build.BID); err != nil {
		return fmt.Errorf("updating build: %w", err)
	}
	utils.ProcessLogger(fmt.Sprintf("%s updating build ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s sending webhooks ...", logHeader))
	updatedBuild, err := GetBuildByBID(build.BID)
	if err != nil {
		utils.ProcessLogger(fmt.Sprintf("%s failed to get updated build for webhooks: %v", logHeader, err))
	} else {
		SendWebhooksForBuild(project.PID, updatedBuild, project)
	}
	utils.ProcessLogger(fmt.Sprintf("%s sending webhooks ... completed", logHeader))

	utils.ProcessLogger(fmt.Sprintf("%s Compare (staged) Done", logHeader))
	return nil
}

func RunComprehensiveCompareStagedAsync(bid string) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				fmt.Printf("FBI --> PANIC recovered in staged comparison goroutine for bid=%s: %v\n", bid, r)
			}
		}()

		fmt.Printf("Start staged comparing in goroutine, bid=%s ...\n", bid)

		build, err := GetBuildByBID(bid)
		if err != nil {
			fmt.Printf("FBI --> Error: failed to get build bid=%s: %v\n", bid, err)
			return
		}

		project, err := GetProjectByPID(build.PID)
		if err != nil {
			fmt.Printf("FBI --> Error: failed to get project pid=%s: %v\n", build.PID, err)
			return
		}

		if err := ComprehensiveCompareStaged(project, build); err != nil {
			fmt.Printf("FBI --> Error: staged comprehensive compare failed for bid=%s: %v\n", bid, err)
			return
		}

		fmt.Printf("FBI --> staged compare completed for bid=%s\n", bid)
	}()
}

func RunComprehensiveCompareAsync(bid string) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				fmt.Printf("FBI --> PANIC recovered in comparison goroutine for bid=%s: %v\n", bid, r)
			}
		}()

		fmt.Printf("Start comparing in goroutine, bid=%s ...\n", bid)

		build, err := GetBuildByBID(bid)
		if err != nil {
			fmt.Printf("FBI --> Error: failed to get build bid=%s: %v\n", bid, err)
			return
		}

		project, err := GetProjectByPID(build.PID)
		if err != nil {
			fmt.Printf("FBI --> Error: failed to get project pid=%s: %v\n", build.PID, err)
			return
		}

		if err := ComprehensiveCompare(project, build); err != nil {
			fmt.Printf("FBI --> Error: comprehensive compare failed for bid=%s: %v\n", bid, err)
			return
		}

		fmt.Printf("FBI --> compare completed for bid=%s\n", bid)
	}()
}
