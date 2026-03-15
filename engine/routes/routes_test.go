package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandleEcho(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "Valid GET request",
			method:         http.MethodGet,
			expectedStatus: http.StatusOK,
			expectedBody:   "Engine Echo",
		},
		{
			name:           "Invalid POST request",
			method:         http.MethodPost,
			expectedStatus: http.StatusMethodNotAllowed,
			expectedBody:   "Method not allowed",
		},
		{
			name:           "Invalid PUT request",
			method:         http.MethodPut,
			expectedStatus: http.StatusMethodNotAllowed,
			expectedBody:   "Method not allowed",
		},
		{
			name:           "Invalid DELETE request",
			method:         http.MethodDelete,
			expectedStatus: http.StatusMethodNotAllowed,
			expectedBody:   "Method not allowed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest(tt.method, "/echo", nil)
			if err != nil {
				t.Fatalf("Failed to create request: %v", err)
			}

			rr := httptest.NewRecorder()
			handler := http.HandlerFunc(handleEcho)

			handler.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.expectedStatus {
				t.Errorf("handler returned wrong status code: got %v want %v",
					status, tt.expectedStatus)
			}

			body, err := io.ReadAll(rr.Body)
			if err != nil {
				t.Fatalf("Failed to read response body: %v", err)
			}

			if strings.TrimSpace(string(body)) != strings.TrimSpace(tt.expectedBody) {
				t.Errorf("handler returned unexpected body: got %q want %q",
					string(body), tt.expectedBody)
			}
		})
	}
}

func TestSetupRoutes(t *testing.T) {
	mux := http.NewServeMux()
	SetupRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/echo", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200 for /echo, got %d", rr.Code)
	}
	if strings.TrimSpace(rr.Body.String()) != "Engine Echo" {
		t.Errorf("expected 'Engine Echo', got %q", rr.Body.String())
	}
}

func TestSetupRoutes_AuthProtected(t *testing.T) {
	mux := http.NewServeMux()
	SetupRoutes(mux)

	req := httptest.NewRequest(http.MethodPost, "/slave/build/initialize", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected status 403 for /slave/build/initialize without API key, got %d", rr.Code)
	}
}

func TestSetupRoutes_ImageUploadAuth(t *testing.T) {
	mux := http.NewServeMux()
	SetupRoutes(mux)

	req := httptest.NewRequest(http.MethodPost, "/slave/images/project-tests/pid123", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected status 403 for /slave/images/project-tests/ without API key, got %d", rr.Code)
	}
}

func TestSetupRoutes_BuildSyncAuth(t *testing.T) {
	mux := http.NewServeMux()
	SetupRoutes(mux)

	req := httptest.NewRequest(http.MethodPost, "/slave/build/sync", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected status 403 for /slave/build/sync without API key, got %d", rr.Code)
	}
}

func TestWriteJSON(t *testing.T) {
	rr := httptest.NewRecorder()
	data := map[string]interface{}{
		"code":    200,
		"message": "ok",
	}
	writeJSON(rr, http.StatusOK, data)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}
	if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if result["message"] != "ok" {
		t.Errorf("expected message 'ok', got %v", result["message"])
	}
}

func TestHandleBuildInitialize_WrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/slave/build/initialize", nil)
	rr := httptest.NewRecorder()
	handleBuildInitialize(rr, req)

	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected status 405, got %d", rr.Code)
	}
}

func TestHandleImageUpload_WrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/slave/images/project-tests/pid123", nil)
	rr := httptest.NewRecorder()
	handleImageUpload(rr, req)

	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected status 405, got %d", rr.Code)
	}
}

func TestHandleImageUpload_MissingPID(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/slave/images/project-tests/", nil)
	rr := httptest.NewRecorder()
	handleImageUpload(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rr.Code)
	}

	var result map[string]interface{}
	json.Unmarshal(rr.Body.Bytes(), &result)
	if result["message"] != "missing 'pid'" {
		t.Errorf("expected 'missing pid' message, got %v", result["message"])
	}
}

func TestHandleBuildSync_WrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/slave/build/sync", nil)
	rr := httptest.NewRecorder()
	handleBuildSync(rr, req)

	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected status 405, got %d", rr.Code)
	}
}

func TestHandleBuildSync_BadMultipartForm(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/slave/build/sync", strings.NewReader("not a multipart"))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=xxx")
	rr := httptest.NewRecorder()
	handleBuildSync(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rr.Code)
	}
}

func TestHandleBuildCreate_WrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/slave/build/create", nil)
	rr := httptest.NewRecorder()
	handleBuildCreate(rr, req)

	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected status 405, got %d", rr.Code)
	}
}

func TestHandleBuildImageUpload_WrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/slave/images/build/bid123", nil)
	rr := httptest.NewRecorder()
	handleBuildImageUpload(rr, req)

	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected status 405, got %d", rr.Code)
	}
}

func TestHandleBuildImageUpload_MissingBID(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/slave/images/build/", nil)
	rr := httptest.NewRecorder()
	handleBuildImageUpload(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rr.Code)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if result["message"] != "missing 'bid'" {
		t.Errorf("expected 'missing bid' message, got %v", result["message"])
	}
}

func TestHandleBuildFinalize_WrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/slave/build/finalize", nil)
	rr := httptest.NewRecorder()
	handleBuildFinalize(rr, req)

	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected status 405, got %d", rr.Code)
	}
}

func TestHandleBuildFinalize_MissingBID(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/slave/build/finalize", nil)
	rr := httptest.NewRecorder()
	handleBuildFinalize(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rr.Code)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if result["message"] != "missing 'bid'" {
		t.Errorf("expected 'missing bid' message, got %v", result["message"])
	}
}

func TestSetupRoutes_BuildCreateAuth(t *testing.T) {
	mux := http.NewServeMux()
	SetupRoutes(mux)

	req := httptest.NewRequest(http.MethodPost, "/slave/build/create", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected status 403 for /slave/build/create without API key, got %d", rr.Code)
	}
}

func TestSetupRoutes_BuildImageUploadAuth(t *testing.T) {
	mux := http.NewServeMux()
	SetupRoutes(mux)

	req := httptest.NewRequest(http.MethodPost, "/slave/images/build/bid123", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected status 403 for /slave/images/build/ without API key, got %d", rr.Code)
	}
}

func TestSetupRoutes_BuildFinalizeAuth(t *testing.T) {
	mux := http.NewServeMux()
	SetupRoutes(mux)

	req := httptest.NewRequest(http.MethodPost, "/slave/build/finalize", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected status 403 for /slave/build/finalize without API key, got %d", rr.Code)
	}
}
