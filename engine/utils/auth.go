package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/md5"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"

	"kouma-engine/config"
)

func CreateEncryptedAPIKey() (string, error) {
	randomBytes := make([]byte, 9)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	apiKey := "AK" + hex.EncodeToString(randomBytes)
	return EncryptAPIKey(apiKey)
}

func EncryptAPIKey(apiKey string) (string, error) {
	salt := make([]byte, 8)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	key, iv := evpBytesToKey([]byte(config.APIKeySecret), salt, 32, 16)

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	plaintext := pkcs7Pad([]byte(apiKey), aes.BlockSize)
	ciphertext := make([]byte, len(plaintext))
	mode := cipher.NewCBCEncrypter(block, iv)
	mode.CryptBlocks(ciphertext, plaintext)

	result := append([]byte("Salted__"), salt...)
	result = append(result, ciphertext...)
	return base64.StdEncoding.EncodeToString(result), nil
}

func DecryptAPIKey(encryptedAPIKey string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encryptedAPIKey)
	if err != nil {
		return "", err
	}

	if len(data) < 16 || string(data[:8]) != "Salted__" {
		return "", errors.New("invalid encrypted data format")
	}

	salt := data[8:16]
	ciphertext := data[16:]

	key, iv := evpBytesToKey([]byte(config.APIKeySecret), salt, 32, 16)

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	if len(ciphertext)%aes.BlockSize != 0 {
		return "", errors.New("ciphertext is not a multiple of the block size")
	}

	mode := cipher.NewCBCDecrypter(block, iv)
	mode.CryptBlocks(ciphertext, ciphertext)

	plaintext, err := pkcs7Unpad(ciphertext, aes.BlockSize)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func AuthenticateAPIKey(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKeyInRequest := r.Header.Get("x-api-key")
		if apiKeyInRequest == "" {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{
				"code":    http.StatusForbidden,
				"message": "missing API Key",
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func evpBytesToKey(password, salt []byte, keyLen, ivLen int) ([]byte, []byte) {
	var derived []byte
	var block []byte
	needed := keyLen + ivLen

	for len(derived) < needed {
		h := md5.New()
		if len(block) > 0 {
			h.Write(block)
		}
		h.Write(password)
		if len(salt) > 0 {
			h.Write(salt)
		}
		block = h.Sum(nil)
		derived = append(derived, block...)
	}

	return derived[:keyLen], derived[keyLen : keyLen+ivLen]
}

func pkcs7Pad(data []byte, blockSize int) []byte {
	padding := blockSize - len(data)%blockSize
	padtext := make([]byte, padding)
	for i := range padtext {
		padtext[i] = byte(padding)
	}
	return append(data, padtext...)
}

func pkcs7Unpad(data []byte, blockSize int) ([]byte, error) {
	if len(data) == 0 {
		return nil, errors.New("empty data")
	}
	padding := int(data[len(data)-1])
	if padding > blockSize || padding == 0 {
		return nil, errors.New("invalid padding")
	}
	for i := len(data) - padding; i < len(data); i++ {
		if data[i] != byte(padding) {
			return nil, errors.New("invalid padding")
		}
	}
	return data[:len(data)-padding], nil
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
