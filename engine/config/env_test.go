package config

import (
	"os"
	"testing"
)

func TestInitDefault(t *testing.T) {
	os.Setenv("MICOO_ENV", "")
	os.Setenv("MICOO_DB_USERNAME", "testuser")
	os.Setenv("MICOO_DB_PASSWORD", "testpass")

	Init()

	if FileServerHost != "http://localhost:8123" {
		t.Errorf("FileServerHost = %q, want %q", FileServerHost, "http://localhost:8123")
	}

	if ExchangeRootDir != "../exchange" {
		t.Errorf("ExchangeRootDir = %q, want %q", ExchangeRootDir, "../exchange")
	}

	expectedDB := "mongodb://testuser:testpass@localhost:27017/micoo"
	if MongoDBURL != expectedDB {
		t.Errorf("MongoDBURL = %q, want %q", MongoDBURL, expectedDB)
	}
}

func TestInitDocker(t *testing.T) {
	os.Setenv("MICOO_ENV", "docker")
	os.Setenv("MICOO_FS_HOST_URL", "http://myhost:8123")
	os.Setenv("MICOO_DB_USERNAME", "user")
	os.Setenv("MICOO_DB_PASSWORD", "pass")

	Init()

	if FileServerHost != "http://myhost:8123" {
		t.Errorf("FileServerHost = %q, want %q", FileServerHost, "http://myhost:8123")
	}

	if ExchangeRootDir != "/exchange" {
		t.Errorf("ExchangeRootDir = %q, want %q", ExchangeRootDir, "/exchange")
	}

	expectedDB := "mongodb://user:pass@micoo-mongodb:27017/micoo"
	if MongoDBURL != expectedDB {
		t.Errorf("MongoDBURL = %q, want %q", MongoDBURL, expectedDB)
	}
}

func TestScreenshotsPathToURL(t *testing.T) {
	os.Setenv("MICOO_ENV", "docker")
	os.Setenv("MICOO_FS_HOST_URL", "http://localhost:8123")
	Init()

	path := "/exchange/file-server/projects/myproject/builds/build_1/login.latest.png"
	expected := "/file-server/projects/myproject/builds/build_1/login.latest.png"
	result := ScreenshotsPathToURL(path)

	if result != expected {
		t.Errorf("ScreenshotsPathToURL() = %q, want %q", result, expected)
	}
}

func TestLocalTestScreenshots(t *testing.T) {
	result := LocalTestScreenshots("myproject")
	if result != "screenshots/myproject" {
		t.Errorf("LocalTestScreenshots() = %q, want %q", result, "screenshots/myproject")
	}
}

func TestLocalTestScreenshotsLatestPath(t *testing.T) {
	result := LocalTestScreenshotsLatestPath("myproject")
	if result != "screenshots/myproject/latest" {
		t.Errorf("LocalTestScreenshotsLatestPath() = %q, want %q", result, "screenshots/myproject/latest")
	}
}

func TestLocalTestScreenshotsBaselinePath(t *testing.T) {
	result := LocalTestScreenshotsBaselinePath("myproject")
	if result != "screenshots/myproject/baseline" {
		t.Errorf("LocalTestScreenshotsBaselinePath() = %q, want %q", result, "screenshots/myproject/baseline")
	}
}

func TestProjectInitializeFolders(t *testing.T) {
	baseline, builds, latest := ProjectInitializeFolders("myproject")

	if baseline != "/file-server/projects/myproject/baseline" {
		t.Errorf("baseline = %q", baseline)
	}
	if builds != "/file-server/projects/myproject/builds" {
		t.Errorf("builds = %q", builds)
	}
	if latest != "/file-server/projects/myproject/latest" {
		t.Errorf("latest = %q", latest)
	}
}

func TestProjectRootPath(t *testing.T) {
	ExchangeRootDir = "/exchange"
	result := ProjectRootPath("myproject")
	expected := "/exchange/file-server/projects/myproject"
	if result != expected {
		t.Errorf("ProjectRootPath() = %q, want %q", result, expected)
	}
}

func TestProjectTestImageWithPath(t *testing.T) {
	ExchangeRootDir = "/exchange"
	result := ProjectTestImageWithPath("myproject", "login.png")
	expected := "/exchange/file-server/projects/myproject/latest/login.png"
	if result != expected {
		t.Errorf("ProjectTestImageWithPath() = %q, want %q", result, expected)
	}
}

func TestPortConfig(t *testing.T) {
	os.Setenv("PORT", "9999")
	Init()
	if Port != "9999" {
		t.Errorf("Port = %q, want %q", Port, "9999")
	}

	os.Setenv("PORT", "")
	Init()
	if Port != "3002" {
		t.Errorf("Port = %q, want %q", Port, "3002")
	}
}

func TestAPIKeySecretConfig(t *testing.T) {
	customSecret := "custom-secret-key-123"
	os.Setenv("MICOO_API_KEY_SECRET", customSecret)
	Init()

	if APIKeySecret != customSecret {
		t.Errorf("APIKeySecret = %q, want %q", APIKeySecret, customSecret)
	}

	os.Setenv("MICOO_API_KEY_SECRET", "")
	Init()

	expectedDefault := "micooProjectApiKey~!@#$%^&*()__+"
	if APIKeySecret != expectedDefault {
		t.Errorf("APIKeySecret = %q, want %q", APIKeySecret, expectedDefault)
	}
}

func TestInitKouma(t *testing.T) {
	os.Setenv("MICOO_ENV", "")
	os.Setenv("MICOO_DB_USERNAME", "")
	os.Setenv("MICOO_DB_PASSWORD", "")
	os.Setenv("MICOO_DB_NAME", "")

	os.Setenv("KOUMA_ENV", "docker")
	os.Setenv("KOUMA_DB_USERNAME", "koumauser")
	os.Setenv("KOUMA_DB_PASSWORD", "koumapass")

	Init()

	if ExchangeRootDir != "/exchange" {
		t.Errorf("ExchangeRootDir = %q, want %q", ExchangeRootDir, "/exchange")
	}

	expectedDB := "mongodb://koumauser:koumapass@micoo-mongodb:27017/kouma"
	if MongoDBURL != expectedDB {
		t.Errorf("MongoDBURL = %q, want %q", MongoDBURL, expectedDB)
	}
}

func TestProjectBuildStagingPath(t *testing.T) {
	ExchangeRootDir = "/exchange"
	result := ProjectBuildStagingPath("myproject", "bid-123")
	expected := "/exchange/file-server/projects/myproject/staging/bid-123"
	if result != expected {
		t.Errorf("ProjectBuildStagingPath() = %q, want %q", result, expected)
	}
}

func TestProjectBuildStagingImagePath(t *testing.T) {
	ExchangeRootDir = "/exchange"
	result := ProjectBuildStagingImagePath("myproject", "bid-123", "login.png")
	expected := "/exchange/file-server/projects/myproject/staging/bid-123/login.png"
	if result != expected {
		t.Errorf("ProjectBuildStagingImagePath() = %q, want %q", result, expected)
	}
}
