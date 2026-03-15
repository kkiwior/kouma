package services

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"

	"kouma-engine/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/integration/mtest"
)

func TestGetAllCasesInBuild_FindError(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("find error", func(mt *mtest.T) {
		originalDB := utils.MongoDB
		utils.MongoDB = mt.DB
		defer func() { utils.MongoDB = originalDB }()

		mt.AddMockResponses(bson.D{
			{Key: "ok", Value: 0},
			{Key: "errmsg", Value: "mock find error"},
		})

		bid := "test-bid"
		cases, err := GetAllCasesInBuild(bid)

		if err == nil {
			t.Fatal("expected error, got nil")
		}

		if cases != nil {
			t.Errorf("expected cases to be nil, got %v", cases)
		}

		expectedErrorSubstring := "finding cases by bid=test-bid"
		if !strings.Contains(err.Error(), expectedErrorSubstring) {
			t.Errorf("expected error to contain %q, got %q", expectedErrorSubstring, err.Error())
		}
	})
}

func TestGetAllCasesInBuild_Success(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		first := mtest.CreateCursorResponse(1, "micoo.cases", mtest.FirstBatch, bson.D{
			{Key: "bid", Value: "bid-1"},
			{Key: "pid", Value: "pid-1"},
			{Key: "caseName", Value: "case1"},
			{Key: "caseResult", Value: "passed"},
		})
		second := mtest.CreateCursorResponse(1, "micoo.cases", mtest.NextBatch, bson.D{
			{Key: "bid", Value: "bid-1"},
			{Key: "pid", Value: "pid-1"},
			{Key: "caseName", Value: "case2"},
			{Key: "caseResult", Value: "failed"},
		})
		killCursors := mtest.CreateCursorResponse(0, "micoo.cases", mtest.NextBatch)
		mt.AddMockResponses(first, second, killCursors)

		cases, err := GetAllCasesInBuild("bid-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(cases) != 2 {
			t.Fatalf("expected 2 cases, got %d", len(cases))
		}
		if cases[0].CaseName != "case1" {
			t.Errorf("expected case1, got %s", cases[0].CaseName)
		}
		if cases[1].CaseName != "case2" {
			t.Errorf("expected case2, got %s", cases[1].CaseName)
		}
	})
}

func TestCreateCase(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success with diff above threshold (failed)", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		mt.AddMockResponses(mtest.CreateSuccessResponse())

		diff := 0.5
		err := CreateCase("pid1", "bid1", "login.png", "/path/latest", "/path/baseline", "/path/diff", &diff, 0.1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	mt.Run("success with diff below threshold (passed)", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		mt.AddMockResponses(mtest.CreateSuccessResponse())

		diff := 0.05
		err := CreateCase("pid1", "bid1", "login.png", "/path/latest", "/path/baseline", "/path/diff", &diff, 0.1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	mt.Run("success with nil diff (undetermined)", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		mt.AddMockResponses(mtest.CreateSuccessResponse())

		err := CreateCase("pid1", "bid1", "login.png", "/path/latest", "", "", nil, 0.1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	mt.Run("insert error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "insert error",
		}))

		diff := 0.5
		err := CreateCase("pid1", "bid1", "login.png", "/path/latest", "/path/baseline", "/path/diff", &diff, 0.1)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if !strings.Contains(err.Error(), "inserting case") {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

func TestSetIgnoringAndComprehensiveResult(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		mt.AddMockResponses(mtest.CreateSuccessResponse(bson.E{Key: "n", Value: int32(1)}))

		err := SetIgnoringAndComprehensiveResult("pid1", "bid1", "case1", nil, "passed")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	mt.Run("success_no_match", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		mt.AddMockResponses(mtest.CreateSuccessResponse(bson.E{Key: "n", Value: int32(0)}))

		oldStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := SetIgnoringAndComprehensiveResult("pid2", "bid2", "case2", nil, "failed")

		w.Close()
		os.Stdout = oldStdout

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		var buf bytes.Buffer
		io.Copy(&buf, r)
		output := buf.String()
		expectedLog := "CASE-SERVICE: set ignoring and comprehensive result failed, no test case found by pid=pid2 bid=bid2 caseName=case2"
		if !strings.Contains(output, expectedLog) {
			t.Errorf("expected log output containing %q, got %q", expectedLog, output)
		}
	})

	mt.Run("db_error", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")
		mt.AddMockResponses(mtest.CreateCommandErrorResponse(mtest.CommandError{
			Code:    123,
			Message: "db error",
		}))

		err := SetIgnoringAndComprehensiveResult("pid3", "bid3", "case3", nil, "passed")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if !strings.Contains(err.Error(), "db error") {
			t.Errorf("unexpected error: %v", err)
		}
	})
}
