package services

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"kouma-engine/models"
	"kouma-engine/utils"

	"go.mongodb.org/mongo-driver/bson"
)

type WebhookPayloadContext struct {
	ProjectName           string
	BuildVersion          string
	BuildResult           string
	BuildStatus           string
	BID                   string
	PID                   string
	CaseCount             int
	CasePassedCount       int
	CaseFailedCount       int
	CaseUndeterminedCount int
	Timestamp             string
	Metadata              map[string]string
}

func GetWebhooksByPID(pid string) ([]models.Webhook, error) {
	coll := utils.GetCollection("webhooks")
	cursor, err := coll.Find(context.Background(), bson.M{"pid": pid, "enabled": true})
	if err != nil {
		return nil, fmt.Errorf("finding webhooks for pid=%s: %w", pid, err)
	}
	defer cursor.Close(context.Background())

	var webhooks []models.Webhook
	if err := cursor.All(context.Background(), &webhooks); err != nil {
		return nil, fmt.Errorf("decoding webhooks: %w", err)
	}
	return webhooks, nil
}

func renderTemplate(template string, ctx *WebhookPayloadContext) string {
	replacements := map[string]string{
		"{{projectName}}":           ctx.ProjectName,
		"{{buildVersion}}":          ctx.BuildVersion,
		"{{buildResult}}":           ctx.BuildResult,
		"{{buildStatus}}":           ctx.BuildStatus,
		"{{bid}}":                   ctx.BID,
		"{{pid}}":                   ctx.PID,
		"{{caseCount}}":             fmt.Sprintf("%d", ctx.CaseCount),
		"{{casePassedCount}}":       fmt.Sprintf("%d", ctx.CasePassedCount),
		"{{caseFailedCount}}":       fmt.Sprintf("%d", ctx.CaseFailedCount),
		"{{caseUndeterminedCount}}": fmt.Sprintf("%d", ctx.CaseUndeterminedCount),
		"{{timestamp}}":             ctx.Timestamp,
	}

	result := template
	for placeholder, value := range replacements {
		result = strings.ReplaceAll(result, placeholder, value)
	}

	for key, value := range ctx.Metadata {
		result = strings.ReplaceAll(result, "{{meta."+key+"}}", value)
	}

	return result
}

func sendSingleWebhook(webhook *models.Webhook, ctx *WebhookPayloadContext) error {
	renderedPayload := renderTemplate(webhook.PayloadTemplate, ctx)

	targetURL := webhook.URL
	var body io.Reader

	if webhook.Method == "POST" && webhook.ContentType == "json" {
		body = strings.NewReader(renderedPayload)
	} else {
		params := parseJSONToParams(renderedPayload)
		if len(params) > 0 {
			queryString := params.Encode()
			if strings.Contains(targetURL, "?") {
				targetURL = targetURL + "&" + queryString
			} else {
				targetURL = targetURL + "?" + queryString
			}
		}
	}

	req, err := http.NewRequest(webhook.Method, targetURL, body)
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}

	for key, value := range webhook.Headers {
		req.Header.Set(key, renderTemplate(value, ctx))
	}

	if webhook.Method == "POST" && webhook.ContentType == "json" {
		if req.Header.Get("Content-Type") == "" {
			req.Header.Set("Content-Type", "application/json")
		}
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook returned status %d", resp.StatusCode)
	}

	return nil
}

func parseJSONToParams(jsonStr string) url.Values {
	params := url.Values{}
	jsonStr = strings.TrimSpace(jsonStr)
	if !strings.HasPrefix(jsonStr, "{") || !strings.HasSuffix(jsonStr, "}") {
		return params
	}
	jsonStr = jsonStr[1 : len(jsonStr)-1]

	pairs := splitJSONPairs(jsonStr)
	for _, pair := range pairs {
		kv := strings.SplitN(pair, ":", 2)
		if len(kv) != 2 {
			continue
		}
		key := strings.TrimSpace(kv[0])
		value := strings.TrimSpace(kv[1])
		key = strings.Trim(key, `"`)
		value = strings.Trim(value, `"`)
		if key != "" {
			params.Set(key, value)
		}
	}
	return params
}

func splitJSONPairs(s string) []string {
	var pairs []string
	var current strings.Builder
	inQuote := false
	escaped := false

	for _, c := range s {
		if escaped {
			current.WriteRune(c)
			escaped = false
			continue
		}
		if c == '\\' {
			current.WriteRune(c)
			escaped = true
			continue
		}
		if c == '"' {
			inQuote = !inQuote
			current.WriteRune(c)
			continue
		}
		if c == ',' && !inQuote {
			pairs = append(pairs, current.String())
			current.Reset()
			continue
		}
		current.WriteRune(c)
	}
	if current.Len() > 0 {
		pairs = append(pairs, current.String())
	}
	return pairs
}

func SendWebhooksForBuild(pid string, build *models.Build, project *models.Project) {
	webhooks, err := GetWebhooksByPID(pid)
	if err != nil {
		fmt.Printf("FBI --> Error: failed to get webhooks for pid=%s: %v\n", pid, err)
		return
	}

	if len(webhooks) == 0 {
		return
	}

	ctx := &WebhookPayloadContext{
		ProjectName:           project.ProjectName,
		BuildVersion:          build.BuildVersion,
		BuildResult:           build.BuildResult,
		BuildStatus:           build.BuildStatus,
		BID:                   build.BID,
		PID:                   build.PID,
		CaseCount:             build.CaseCount,
		CasePassedCount:       build.CasePassedCount,
		CaseFailedCount:       build.CaseFailedCount,
		CaseUndeterminedCount: build.CaseUndeterminedCount,
		Timestamp:             time.Now().UTC().Format(time.RFC3339),
		Metadata:              build.Metadata,
	}

	for i := range webhooks {
		webhook := &webhooks[i]

		shouldSend := webhook.Condition == "always" ||
			(webhook.Condition == "success" && build.BuildResult == "passed") ||
			(webhook.Condition == "fail" && (build.BuildResult == "failed" || build.BuildResult == "undetermined"))

		if !shouldSend {
			continue
		}

		if err := sendSingleWebhook(webhook, ctx); err != nil {
			fmt.Printf("FBI --> Webhook [%s] (wid=%s) FAILED: %v\n", webhook.Name, webhook.WID, err)
		} else {
			fmt.Printf("FBI --> Webhook [%s] (wid=%s) sent successfully\n", webhook.Name, webhook.WID)
		}
	}
}
