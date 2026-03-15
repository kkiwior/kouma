package config

import (
	"os"
	"path/filepath"
	"strings"
)

var (
	FileServerHost  string
	ExchangeRootDir string
	MongoDBURL      string
	MongoDBName     string
	Port            string
	APIKeySecret    string
)

func getEnv(key string, defaultValue string) string {
	val := os.Getenv("KOUMA_" + key)
	if val == "" {
		val = os.Getenv("MICOO_" + key)
	}
	if val == "" {
		return defaultValue
	}
	return val
}

func isMigration() bool {
	return os.Getenv("MICOO_ENV") != "" || os.Getenv("MICOO_DB_USERNAME") != "" || os.Getenv("MICOO_DB_NAME") != ""
}

func getDatabaseName() string {
	dbName := getEnv("DB_NAME", "")
	if dbName != "" {
		return dbName
	}

	if isMigration() {
		return "micoo"
	}

	return "kouma"
}

func Init() {
	env := getEnv("ENV", "")
	dbUser := getEnv("DB_USERNAME", "")
	dbPass := getEnv("DB_PASSWORD", "")
	dbHost := getEnv("DB_HOST", "localhost")
	dbName := getDatabaseName()
	MongoDBName = dbName

	if env == "docker" {
		FileServerHost = getEnv("FS_HOST_URL", "http://micoo-file-server:8123")
		ExchangeRootDir = getEnv("EXCHANGE_ROOT_DIR", "/exchange")
		mongoHost := getEnv("DB_HOST", "micoo-mongodb")
		MongoDBURL = "mongodb://" + dbUser + ":" + dbPass + "@" + mongoHost + ":27017/" + dbName
	} else {
		FileServerHost = getEnv("FS_HOST_URL", "http://localhost:8123")
		ExchangeRootDir = getEnv("EXCHANGE_ROOT_DIR", "")
		if ExchangeRootDir == "" {
			if isMigration() {
				ExchangeRootDir = "../exchange"
			} else {
				ExchangeRootDir = "../kouma-exchange"
			}
		}
		MongoDBURL = "mongodb://" + dbUser + ":" + dbPass + "@" + dbHost + ":27017/" + dbName
	}

	Port = os.Getenv("PORT")
	if Port == "" {
		Port = "3002"
	}

	APIKeySecret = getEnv("API_KEY_SECRET", "micooProjectApiKey~!@#$%^&*()__+")
}

func ScreenshotsPathToURL(screenshotsPath string) string {
	return strings.Replace(screenshotsPath, ExchangeRootDir, FileServerHost, 1)
}

func LocalTestScreenshots(projectName string) string {
	return filepath.Join("screenshots", projectName)
}

func LocalTestScreenshotsLatestPath(projectName string) string {
	return filepath.Join(LocalTestScreenshots(projectName), "latest")
}

func LocalTestScreenshotsBaselinePath(projectName string) string {
	return filepath.Join(LocalTestScreenshots(projectName), "baseline")
}

func ProjectInitializeFolders(projectName string) (baseline, builds, latest string) {
	baseline = "/file-server/projects/" + projectName + "/baseline"
	builds = "/file-server/projects/" + projectName + "/builds"
	latest = "/file-server/projects/" + projectName + "/latest"
	return
}

func ProjectRootPath(projectName string) string {
	return ExchangeRootDir + "/file-server/projects/" + projectName
}

func ProjectTestImageWithPath(projectName, testScreenshotName string) string {
	_, _, latest := ProjectInitializeFolders(projectName)
	return filepath.Join(ExchangeRootDir, latest, testScreenshotName)
}

func ProjectBuildStagingPath(projectName, bid string) string {
	return filepath.Join(ExchangeRootDir, "file-server/projects", projectName, "staging", bid)
}

func ProjectBuildStagingImagePath(projectName, bid, testScreenshotName string) string {
	return filepath.Join(ProjectBuildStagingPath(projectName, bid), testScreenshotName)
}
