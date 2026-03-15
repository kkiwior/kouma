package services

import (
	"testing"

	"kouma-engine/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/integration/mtest"
)

func TestInitializeBuild(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(
			mtest.CreateCursorResponse(1, "micoo.builds", mtest.FirstBatch, bson.D{
				{"n", 5},
			}),
			mtest.CreateSuccessResponse(),
		)

		build, err := InitializeBuild("pid-123", "v1.0", map[string]string{"foo": "bar"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if build.PID != "pid-123" {
			t.Errorf("expected pid pid-123, got %s", build.PID)
		}
		if build.BuildIndex != 6 {
			t.Errorf("expected BuildIndex 6, got %d", build.BuildIndex)
		}
		if build.BuildResult != "undetermined" {
			t.Errorf("expected BuildResult undetermined, got %s", build.BuildResult)
		}
		if build.BuildStatus != "processing" {
			t.Errorf("expected BuildStatus processing, got %s", build.BuildStatus)
		}
		if build.BuildVersion != "v1.0" {
			t.Errorf("expected BuildVersion v1.0, got %s", build.BuildVersion)
		}
		if build.Metadata["foo"] != "bar" {
			t.Errorf("expected Metadata foo=bar, got %s", build.Metadata["foo"])
		}
	})

	mt.Run("count error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(
			mtest.CreateCommandErrorResponse(mtest.CommandError{
				Code:    123,
				Message: "count error",
			}),
		)

		_, err := InitializeBuild("pid-123", "v1.0", map[string]string{"foo": "bar"})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "counting builds: count error" {
			t.Errorf("unexpected error message: %s", err.Error())
		}
	})

	mt.Run("insert error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(
			mtest.CreateCursorResponse(1, "micoo.builds", mtest.FirstBatch, bson.D{
				{"n", 5},
			}),
			mtest.CreateCommandErrorResponse(mtest.CommandError{
				Code:    123,
				Message: "insert error",
			}),
		)

		_, err := InitializeBuild("pid-123", "v1.0", map[string]string{"foo": "bar"})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "inserting build: insert error" {
			t.Errorf("unexpected error message: %s", err.Error())
		}
	})
}

func TestFinalizeBuild(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(
			mtest.CreateSuccessResponse(),
		)

		err := FinalizeBuild("bid-123", "passed", 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	mt.Run("update error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(
			mtest.CreateCommandErrorResponse(mtest.CommandError{
				Code:    123,
				Message: "update error",
			}),
		)

		err := FinalizeBuild("bid-123", "passed", 10)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "update error" {
			t.Errorf("unexpected error message: %s", err.Error())
		}
	})
}

func TestGetBuildByBID(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(
			mtest.CreateCursorResponse(1, "micoo.builds", mtest.FirstBatch, bson.D{
				{"bid", "bid-123"},
				{"pid", "pid-456"},
			}),
		)

		build, err := GetBuildByBID("bid-123")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if build.BID != "bid-123" {
			t.Errorf("expected bid bid-123, got %s", build.BID)
		}
		if build.PID != "pid-456" {
			t.Errorf("expected pid pid-456, got %s", build.PID)
		}
	})

	mt.Run("find error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(
			mtest.CreateCommandErrorResponse(mtest.CommandError{
				Code:    123,
				Message: "find error",
			}),
		)

		_, err := GetBuildByBID("bid-123")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "finding build by bid=bid-123: find error" {
			t.Errorf("unexpected error message: %s", err.Error())
		}
	})
}

func TestUpdateTestCaseCount(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(
			mtest.CreateSuccessResponse(),
		)

		err := UpdateTestCaseCount("pid-123", "bid-456", 5, 2, 1, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	mt.Run("update error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(
			mtest.CreateCommandErrorResponse(mtest.CommandError{
				Code:    123,
				Message: "update error",
			}),
		)

		err := UpdateTestCaseCount("pid-123", "bid-456", 5, 2, 1, 0)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if err.Error() != "update error" {
			t.Errorf("unexpected error message: %s", err.Error())
		}
	})
}
