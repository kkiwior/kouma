package services

import (
	"context"
	"fmt"
	"time"

	"kouma-engine/config"
	"kouma-engine/models"
	"kouma-engine/utils"

	"go.mongodb.org/mongo-driver/bson"
)

func CreateCase(pid, bid, caseName, latestPath, baselinePath, diffPath string, diffPercentage *float64, threshold float64) error {
	coll := utils.GetCollection("cases")

	linkLatest := config.ScreenshotsPathToURL(latestPath)
	linkBaseline := ""
	if baselinePath != "" {
		linkBaseline = config.ScreenshotsPathToURL(baselinePath)
	}
	linkDiff := ""
	if diffPath != "" {
		linkDiff = config.ScreenshotsPathToURL(diffPath)
	}

	caseResult := "undetermined"
	if diffPercentage != nil {
		if *diffPercentage > threshold {
			caseResult = "failed"
		} else {
			caseResult = "passed"
		}
	}

	now := time.Now()
	testCase := &models.Case{
		PID:            pid,
		BID:            bid,
		CID:            utils.CaseUUID(),
		CaseName:       caseName,
		DiffPercentage: diffPercentage,
		CaseResult:     caseResult,
		LinkBaseline:   linkBaseline,
		LinkLatest:     linkLatest,
		LinkDiff:       linkDiff,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	_, err := coll.InsertOne(context.Background(), testCase)
	if err != nil {
		return fmt.Errorf("inserting case: %w", err)
	}
	return nil
}

func GetAllCasesInBuild(bid string) ([]models.Case, error) {
	coll := utils.GetCollection("cases")

	cursor, err := coll.Find(context.Background(), bson.M{"bid": bid})
	if err != nil {
		return nil, fmt.Errorf("finding cases by bid=%s: %w", bid, err)
	}
	defer cursor.Close(context.Background())

	var cases []models.Case
	if err := cursor.All(context.Background(), &cases); err != nil {
		return nil, err
	}
	return cases, nil
}

func SetIgnoringAndComprehensiveResult(pid, bid, caseName string, rectangles []models.Rectangle, comprehensiveCaseResult string) error {
	coll := utils.GetCollection("cases")
	result, err := coll.UpdateOne(
		context.Background(),
		bson.M{"pid": pid, "bid": bid, "caseName": caseName},
		bson.M{"$set": bson.M{
			"ignoringRectangles":      rectangles,
			"comprehensiveCaseResult": comprehensiveCaseResult,
			"updatedAt":               time.Now(),
		}},
	)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		fmt.Printf("CASE-SERVICE: set ignoring and comprehensive result failed, no test case found by pid=%s bid=%s caseName=%s\n",
			pid, bid, caseName)
	}
	return nil
}

func CreateCases(pid, bid string, cases map[string]*CaseInfo, threshold float64) error {
	if len(cases) == 0 {
		return nil
	}

	coll := utils.GetCollection("cases")
	var documents []interface{}
	now := time.Now()

	for _, caseInfo := range cases {
		linkLatest := config.ScreenshotsPathToURL(caseInfo.LatestPath)
		linkBaseline := ""
		if caseInfo.BaselinePath != "" {
			linkBaseline = config.ScreenshotsPathToURL(caseInfo.BaselinePath)
		}
		linkDiff := ""
		if caseInfo.DiffPath != "" {
			linkDiff = config.ScreenshotsPathToURL(caseInfo.DiffPath)
		}

		caseResult := "undetermined"
		if caseInfo.DiffPercentage != nil {
			if *caseInfo.DiffPercentage > threshold {
				caseResult = "failed"
			} else {
				caseResult = "passed"
			}
		}

		testCase := &models.Case{
			PID:            pid,
			BID:            bid,
			CID:            utils.CaseUUID(),
			CaseName:       caseInfo.CaseName,
			DiffPercentage: caseInfo.DiffPercentage,
			CaseResult:     caseResult,
			LinkBaseline:   linkBaseline,
			LinkLatest:     linkLatest,
			LinkDiff:       linkDiff,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		documents = append(documents, testCase)
	}

	_, err := coll.InsertMany(context.Background(), documents)
	if err != nil {
		return fmt.Errorf("inserting cases: %w", err)
	}
	return nil
}
