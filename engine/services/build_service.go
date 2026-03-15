package services

import (
	"context"
	"fmt"
	"time"

	"kouma-engine/models"
	"kouma-engine/utils"

	"go.mongodb.org/mongo-driver/bson"
)

func InitializeBuild(pid, version string, metadata map[string]string) (*models.Build, error) {
	coll := utils.GetCollection("builds")

	count, err := coll.CountDocuments(context.Background(), bson.M{"pid": pid})
	if err != nil {
		return nil, fmt.Errorf("counting builds: %w", err)
	}

	build := &models.Build{
		PID:          pid,
		BID:          utils.BuildUUID(),
		BuildResult:  "undetermined",
		BuildStatus:  "processing",
		BuildVersion: version,
		BuildIndex:   int(count) + 1,
		CreatedAt:    time.Now(),
		Metadata:     metadata,
	}

	_, err = coll.InsertOne(context.Background(), build)
	if err != nil {
		return nil, fmt.Errorf("inserting build: %w", err)
	}

	return build, nil
}

func FinalizeBuild(bid, buildResult string, caseCount int) error {
	coll := utils.GetCollection("builds")
	_, err := coll.UpdateOne(
		context.Background(),
		bson.M{"bid": bid},
		bson.M{"$set": bson.M{
			"buildStatus": "completed",
			"buildResult": buildResult,
			"caseCount":   caseCount,
		}},
	)
	return err
}

func GetBuildByBID(bid string) (*models.Build, error) {
	coll := utils.GetCollection("builds")
	var build models.Build
	err := coll.FindOne(context.Background(), bson.M{"bid": bid}).Decode(&build)
	if err != nil {
		return nil, fmt.Errorf("finding build by bid=%s: %w", bid, err)
	}
	fmt.Printf("FBI --> build.pid %s\n", build.PID)
	return &build, nil
}

func UpdateTestCaseCount(pid, bid string, passed, failed, undetermined, passedByIgnoring int) error {
	coll := utils.GetCollection("builds")
	_, err := coll.UpdateOne(
		context.Background(),
		bson.M{"pid": pid, "bid": bid},
		bson.M{"$set": bson.M{
			"casePassedCount":                     passed,
			"caseFailedCount":                     failed,
			"caseUndeterminedCount":               undetermined,
			"casePassedByIgnoringRectanglesCount": passedByIgnoring,
		}},
	)
	return err
}
