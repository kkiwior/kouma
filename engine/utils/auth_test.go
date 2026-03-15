package utils

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"kouma-engine/config"
	"os"
	"strings"
	"testing"
)

func TestMain(m *testing.M) {
	config.Init()
	os.Exit(m.Run())
}

func TestEncryptDecryptAPIKey(t *testing.T) {
	originalKey := "AK1234567890abcdef12"

	encrypted, err := EncryptAPIKey(originalKey)
	if err != nil {
		t.Fatalf("EncryptAPIKey failed: %v", err)
	}

	if encrypted == originalKey {
		t.Error("Encrypted key should not equal original key")
	}

	decrypted, err := DecryptAPIKey(encrypted)
	if err != nil {
		t.Fatalf("DecryptAPIKey failed: %v", err)
	}

	if decrypted != originalKey {
		t.Errorf("DecryptAPIKey() = %q, want %q", decrypted, originalKey)
	}
}

func TestCreateEncryptedAPIKey(t *testing.T) {
	encrypted, err := CreateEncryptedAPIKey()
	if err != nil {
		t.Fatalf("CreateEncryptedAPIKey failed: %v", err)
	}

	decrypted, err := DecryptAPIKey(encrypted)
	if err != nil {
		t.Fatalf("DecryptAPIKey failed: %v", err)
	}

	if !strings.HasPrefix(decrypted, "AK") {
		t.Errorf("Decrypted key should start with 'AK', got %q", decrypted)
	}

	if len(decrypted) != 20 {
		t.Errorf("Decrypted key length = %d, want 20", len(decrypted))
	}
}

func TestMultipleEncryptionsProduceDifferentCiphertext(t *testing.T) {
	key := "AKtestkey1234567890a"

	enc1, err := EncryptAPIKey(key)
	if err != nil {
		t.Fatal(err)
	}

	enc2, err := EncryptAPIKey(key)
	if err != nil {
		t.Fatal(err)
	}

	if enc1 == enc2 {
		t.Error("Two encryptions of the same key should produce different ciphertexts due to random salt")
	}

	dec1, _ := DecryptAPIKey(enc1)
	dec2, _ := DecryptAPIKey(enc2)
	if dec1 != dec2 {
		t.Error("Different ciphertexts should decrypt to the same key")
	}
}

func TestAuthenticateAPIKey(t *testing.T) {
	tests := []struct {
		name           string
		apiKey         string
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "missing API Key",
			apiKey:         "",
			expectedStatus: 403,
			expectedBody:   `{"code":403,"message":"missing API Key"}`,
		},
		{
			name:           "valid API Key",
			apiKey:         "some-api-key",
			expectedStatus: 200,
			expectedBody:   "OK",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			if tt.apiKey != "" {
				req.Header.Set("x-api-key", tt.apiKey)
			}

			rr := httptest.NewRecorder()

			nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				w.Write([]byte("OK"))
			})

			handler := AuthenticateAPIKey(nextHandler)
			handler.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.expectedStatus {
				t.Errorf("handler returned wrong status code: got %v want %v",
					status, tt.expectedStatus)
			}

			if strings.TrimSpace(rr.Body.String()) != tt.expectedBody {
				t.Errorf("handler returned unexpected body: got %v want %v",
					rr.Body.String(), tt.expectedBody)
			}
		})
	}
}

func TestDecryptAPIKey_InvalidBase64(t *testing.T) {
	_, err := DecryptAPIKey("not-valid-base64!!!")
	if err == nil {
		t.Error("expected error for invalid base64")
	}
}

func TestDecryptAPIKey_InvalidFormat(t *testing.T) {
	_, err := DecryptAPIKey("dG9vc2hvcnQ=")
	if err == nil {
		t.Error("expected error for invalid format")
	}
}

func TestDecryptAPIKey_InvalidCiphertextLength(t *testing.T) {
	data := append([]byte("Salted__"), []byte("12345678abc")...)
	encoded := base64.StdEncoding.EncodeToString(data)
	_, err := DecryptAPIKey(encoded)
	if err == nil {
		t.Error("expected error for invalid ciphertext length")
	}
}

func TestPkcs7Unpad_EmptyData(t *testing.T) {
	_, err := pkcs7Unpad(nil, 16)
	if err == nil || err.Error() != "empty data" {
		t.Errorf("expected 'empty data' error, got %v", err)
	}
}

func TestPkcs7Unpad_InvalidPadding_Zero(t *testing.T) {
	data := []byte{1, 2, 3, 0}
	_, err := pkcs7Unpad(data, 16)
	if err == nil || err.Error() != "invalid padding" {
		t.Errorf("expected 'invalid padding' error, got %v", err)
	}
}

func TestPkcs7Unpad_InvalidPadding_TooLarge(t *testing.T) {
	data := []byte{1, 2, 3, 20}
	_, err := pkcs7Unpad(data, 16)
	if err == nil || err.Error() != "invalid padding" {
		t.Errorf("expected 'invalid padding' error, got %v", err)
	}
}

func TestPkcs7Unpad_InconsistentPadding(t *testing.T) {
	data := []byte{1, 2, 1, 3}
	_, err := pkcs7Unpad(data, 16)
	if err == nil || err.Error() != "invalid padding" {
		t.Errorf("expected 'invalid padding' error, got %v", err)
	}
}

func TestPkcs7Pad(t *testing.T) {
	data := []byte("hello")
	padded := pkcs7Pad(data, 16)
	if len(padded) != 16 {
		t.Errorf("expected padded length 16, got %d", len(padded))
	}
	for i := 5; i < 16; i++ {
		if padded[i] != 11 {
			t.Errorf("expected padding byte 11, got %d at index %d", padded[i], i)
		}
	}
}

func TestPkcs7Pad_ExactBlockSize(t *testing.T) {
	data := make([]byte, 16)
	padded := pkcs7Pad(data, 16)
	if len(padded) != 32 {
		t.Errorf("expected padded length 32, got %d", len(padded))
	}
}

func TestWriteJSON(t *testing.T) {
	rr := httptest.NewRecorder()
	data := map[string]string{"key": "value"}
	writeJSON(rr, http.StatusOK, data)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}
	if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}
	if !strings.Contains(rr.Body.String(), "value") {
		t.Errorf("expected body to contain 'value', got %q", rr.Body.String())
	}
}

func TestEvpBytesToKey_EmptySalt(t *testing.T) {
	key, iv := evpBytesToKey([]byte("password"), nil, 32, 16)
	if len(key) != 32 {
		t.Errorf("expected key length 32, got %d", len(key))
	}
	if len(iv) != 16 {
		t.Errorf("expected iv length 16, got %d", len(iv))
	}
}
