package services

import (
	"kouma-engine/models"
	"kouma-engine/utils"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/integration/mtest"
)

func TestGetPlainIgnoring(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success - returns mapped PlainIgnoring", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("mtest")

		expectedIgnoring := models.Ignoring{
			PID:      "PID123",
			CaseName: "CaseABC",
			Rectangles: []models.Rectangle{
				{X: 10, Y: 20, Width: 100, Height: 200},
				{X: 30, Y: 40, Width: 300, Height: 400},
			},
		}

		mt.AddMockResponses(mtest.CreateCursorResponse(1, "mtest.ignorings", mtest.FirstBatch, bson.D{
			{Key: "pid", Value: expectedIgnoring.PID},
			{Key: "caseName", Value: expectedIgnoring.CaseName},
			{Key: "rectangles", Value: bson.A{
				bson.D{
					{Key: "x", Value: 10},
					{Key: "y", Value: 20},
					{Key: "width", Value: 100},
					{Key: "height", Value: 200},
				},
				bson.D{
					{Key: "x", Value: 30},
					{Key: "y", Value: 40},
					{Key: "width", Value: 300},
					{Key: "height", Value: 400},
				},
			}},
		}))

		result, err := GetPlainIgnoring("PID123", "CaseABC")
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if result == nil {
			t.Fatalf("Expected result, got nil")
		}

		if result.PID != "PID123" {
			t.Errorf("Expected PID 'PID123', got %s", result.PID)
		}
		if result.CaseName != "CaseABC" {
			t.Errorf("Expected CaseName 'CaseABC', got %s", result.CaseName)
		}
		if len(result.Rectangles) != 2 {
			t.Fatalf("Expected 2 rectangles, got %d", len(result.Rectangles))
		}
		if result.Rectangles[0].X != 10 || result.Rectangles[0].Y != 20 || result.Rectangles[0].Width != 100 || result.Rectangles[0].Height != 200 {
			t.Errorf("Rectangle 0 mismatch: %+v", result.Rectangles[0])
		}
		if result.Rectangles[1].X != 30 || result.Rectangles[1].Y != 40 || result.Rectangles[1].Width != 300 || result.Rectangles[1].Height != 400 {
			t.Errorf("Rectangle 1 mismatch: %+v", result.Rectangles[1])
		}
	})

	mt.Run("not found - returns nil without error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("mtest")

		mt.AddMockResponses(mtest.CreateCursorResponse(0, "mtest.ignorings", mtest.FirstBatch))

		result, err := GetPlainIgnoring("PID456", "CaseXYZ")
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if result != nil {
			t.Fatalf("Expected nil result, got %+v", result)
		}
	})
}

func TestGetPlainIgnorings(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success - multiple results", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("mtest")

		first := mtest.CreateCursorResponse(1, "mtest.ignorings", mtest.FirstBatch, bson.D{
			{Key: "pid", Value: "PID123"},
			{Key: "caseName", Value: "case1"},
			{Key: "rectangles", Value: bson.A{
				bson.D{
					{Key: "x", Value: 10},
					{Key: "y", Value: 20},
					{Key: "width", Value: 100},
					{Key: "height", Value: 200},
				},
			}},
		})
		second := mtest.CreateCursorResponse(1, "mtest.ignorings", mtest.NextBatch, bson.D{
			{Key: "pid", Value: "PID123"},
			{Key: "caseName", Value: "case2"},
			{Key: "rectangles", Value: bson.A{
				bson.D{
					{Key: "x", Value: 30},
					{Key: "y", Value: 40},
					{Key: "width", Value: 300},
					{Key: "height", Value: 400},
				},
			}},
		})
		killCursors := mtest.CreateCursorResponse(0, "mtest.ignorings", mtest.NextBatch)
		mt.AddMockResponses(first, second, killCursors)

		result, err := GetPlainIgnorings("PID123", []string{"case1", "case2"})
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if len(result) != 2 {
			t.Fatalf("Expected 2 results, got %d", len(result))
		}
		if result["case1"] == nil {
			t.Error("Expected case1 to be present")
		}
		if result["case2"] == nil {
			t.Error("Expected case2 to be present")
		}
		if result["case1"].Rectangles[0].X != 10 {
			t.Errorf("Expected X=10, got %f", result["case1"].Rectangles[0].X)
		}
	})

	mt.Run("find error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("mtest")

		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "find error",
		}))

		_, err := GetPlainIgnorings("PID123", []string{"case1"})
		if err == nil {
			t.Fatal("Expected error, got nil")
		}
	})

	mt.Run("empty results", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("mtest")

		mt.AddMockResponses(mtest.CreateCursorResponse(0, "mtest.ignorings", mtest.FirstBatch))

		result, err := GetPlainIgnorings("PID123", []string{"case1"})
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if len(result) != 0 {
			t.Fatalf("Expected 0 results, got %d", len(result))
		}
	})
}
