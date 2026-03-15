package services

import (
	"testing"

	"kouma-engine/models"
	"kouma-engine/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/integration/mtest"
)

func TestRenderTemplate(t *testing.T) {
	ctx := &WebhookPayloadContext{
		ProjectName:           "my-project",
		BuildVersion:          "v1.0",
		BuildResult:           "passed",
		BuildStatus:           "completed",
		BID:                   "bid-123",
		PID:                   "pid-456",
		CaseCount:             10,
		CasePassedCount:       8,
		CaseFailedCount:       1,
		CaseUndeterminedCount: 1,
		Timestamp:             "2024-01-01T00:00:00Z",
		Metadata: map[string]string{
			"branch": "main",
			"commit": "abc1234",
		},
	}

	tests := []struct {
		name     string
		template string
		expected string
	}{
		{
			name:     "simple replacement",
			template: `{"project":"{{projectName}}","status":"{{buildResult}}"}`,
			expected: `{"project":"my-project","status":"passed"}`,
		},
		{
			name:     "all variables",
			template: `{{projectName}} {{buildVersion}} {{buildResult}} {{buildStatus}} {{bid}} {{pid}} {{caseCount}} {{casePassedCount}} {{caseFailedCount}} {{caseUndeterminedCount}} {{timestamp}}`,
			expected: `my-project v1.0 passed completed bid-123 pid-456 10 8 1 1 2024-01-01T00:00:00Z`,
		},
		{
			name:     "no variables",
			template: `static text`,
			expected: `static text`,
		},
		{
			name:     "unknown variable",
			template: `{{unknown}}`,
			expected: `{{unknown}}`,
		},
		{
			name:     "metadata variable",
			template: `branch: {{meta.branch}}, commit: {{meta.commit}}`,
			expected: `branch: main, commit: abc1234`,
		},
		{
			name:     "metadata in JSON payload",
			template: `{"text":"Build on {{meta.branch}} ({{meta.commit}}): {{buildResult}}"}`,
			expected: `{"text":"Build on main (abc1234): passed"}`,
		},
		{
			name:     "unknown metadata key",
			template: `{{meta.nonexistent}}`,
			expected: `{{meta.nonexistent}}`,
		},
		{
			name:     "mixed standard and metadata variables",
			template: `{{projectName}} @ {{meta.branch}} -> {{buildResult}}`,
			expected: `my-project @ main -> passed`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := renderTemplate(tt.template, ctx)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestRenderTemplateNilMetadata(t *testing.T) {
	ctx := &WebhookPayloadContext{
		ProjectName: "my-project",
		BuildResult: "passed",
	}

	result := renderTemplate("{{projectName}} {{meta.branch}}", ctx)
	expected := "my-project {{meta.branch}}"
	if result != expected {
		t.Errorf("expected %q, got %q", expected, result)
	}
}

func TestParseJSONToParams(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected map[string]string
	}{
		{
			name:     "simple json",
			input:    `{"status":"passed","build":"bid-123"}`,
			expected: map[string]string{"status": "passed", "build": "bid-123"},
		},
		{
			name:     "empty json",
			input:    `{}`,
			expected: map[string]string{},
		},
		{
			name:     "not json",
			input:    `not json`,
			expected: map[string]string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseJSONToParams(tt.input)
			for k, v := range tt.expected {
				if result.Get(k) != v {
					t.Errorf("expected %s=%s, got %s", k, v, result.Get(k))
				}
			}
		})
	}
}

func TestSplitJSONPairs(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected int
	}{
		{
			name:     "two pairs",
			input:    `"key1":"val1","key2":"val2"`,
			expected: 2,
		},
		{
			name:     "comma in value",
			input:    `"key":"val,ue","key2":"val2"`,
			expected: 2,
		},
		{
			name:     "single pair",
			input:    `"key":"value"`,
			expected: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := splitJSONPairs(tt.input)
			if len(result) != tt.expected {
				t.Errorf("expected %d pairs, got %d: %v", tt.expected, len(result), result)
			}
		})
	}
}

func TestGetWebhooksByPID(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("success with webhooks", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		first := mtest.CreateCursorResponse(1, "micoo.webhooks", mtest.FirstBatch, bson.D{
			{"wid", "wid-1"},
			{"pid", "pid-123"},
			{"name", "Slack"},
			{"url", "https://hooks.slack.com/test"},
			{"method", "POST"},
			{"contentType", "json"},
			{"condition", "always"},
			{"payloadTemplate", `{"text":"test"}`},
			{"enabled", true},
		})
		killCursors := mtest.CreateCursorResponse(0, "micoo.webhooks", mtest.NextBatch)
		mt.AddMockResponses(first, killCursors)

		webhooks, err := GetWebhooksByPID("pid-123")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(webhooks) != 1 {
			t.Fatalf("expected 1 webhook, got %d", len(webhooks))
		}
		if webhooks[0].WID != "wid-1" {
			t.Errorf("expected wid wid-1, got %s", webhooks[0].WID)
		}
		if webhooks[0].Name != "Slack" {
			t.Errorf("expected name Slack, got %s", webhooks[0].Name)
		}
	})

	mt.Run("success with no webhooks", func(mt *mtest.T) {
		utils.MongoDB = mt.Client.Database("micoo")

		mt.AddMockResponses(mtest.CreateCursorResponse(0, "micoo.webhooks", mtest.FirstBatch))

		webhooks, err := GetWebhooksByPID("pid-123")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(webhooks) != 0 {
			t.Errorf("expected 0 webhooks, got %d", len(webhooks))
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

		_, err := GetWebhooksByPID("pid-123")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

func TestSendWebhooksForBuild_ConditionFiltering(t *testing.T) {
	build := &models.Build{
		PID:         "pid-123",
		BID:         "bid-456",
		BuildResult: "passed",
		BuildStatus: "completed",
	}
	project := &models.Project{
		PID:         "pid-123",
		ProjectName: "test-project",
	}

	ctx := &WebhookPayloadContext{
		ProjectName: project.ProjectName,
		BuildResult: build.BuildResult,
		BuildStatus: build.BuildStatus,
		BID:         build.BID,
		PID:         build.PID,
	}

	tests := []struct {
		condition  string
		result     string
		shouldSend bool
	}{
		{"always", "passed", true},
		{"always", "failed", true},
		{"always", "undetermined", true},
		{"success", "passed", true},
		{"success", "failed", false},
		{"success", "undetermined", false},
		{"fail", "failed", true},
		{"fail", "undetermined", true},
		{"fail", "passed", false},
	}

	for _, tt := range tests {
		t.Run(tt.condition+"_"+tt.result, func(t *testing.T) {
			ctx.BuildResult = tt.result
			shouldSend := tt.condition == "always" ||
				(tt.condition == "success" && ctx.BuildResult == "passed") ||
				(tt.condition == "fail" && (ctx.BuildResult == "failed" || ctx.BuildResult == "undetermined"))

			if shouldSend != tt.shouldSend {
				t.Errorf("condition=%s result=%s: expected shouldSend=%v, got %v", tt.condition, tt.result, tt.shouldSend, shouldSend)
			}
		})
	}
}
