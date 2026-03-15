package routes

import (
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"kouma-engine/config"
	"kouma-engine/services"
	"kouma-engine/utils"
)

func SetupRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/echo", handleEcho)

	mux.Handle("/slave/build/initialize", utils.AuthenticateAPIKey(http.HandlerFunc(handleBuildInitialize)))
	mux.Handle("/slave/images/project-tests/", utils.AuthenticateAPIKey(http.HandlerFunc(handleImageUpload)))

	mux.Handle("/slave/build/sync", utils.AuthenticateAPIKey(http.HandlerFunc(handleBuildSync)))

	mux.Handle("/slave/build/create", utils.AuthenticateAPIKey(http.HandlerFunc(handleBuildCreate)))
	mux.Handle("/slave/images/build/", utils.AuthenticateAPIKey(http.HandlerFunc(handleBuildImageUpload)))
	mux.Handle("/slave/build/finalize", utils.AuthenticateAPIKey(http.HandlerFunc(handleBuildFinalize)))
}

func handleEcho(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Write([]byte("Engine Echo"))
}

func handleBuildInitialize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pid := r.URL.Query().Get("pid")
	buildVersion := r.URL.Query().Get("buildVersion")

	metadata := make(map[string]string)
	for key, values := range r.URL.Query() {
		if strings.HasPrefix(key, "meta_") && len(values) > 0 {
			metaKey := strings.TrimPrefix(key, "meta_")
			metadata[metaKey] = values[0]
		}
	}

	project, err := services.GetProjectByPID(pid)
	if err != nil || project == nil {
		errorMessage := fmt.Sprintf("projectId=%s not exist!", pid)
		fmt.Fprintf(os.Stderr, "FBI --> Error: %s\n", errorMessage)
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": errorMessage,
		})
		return
	}
	
	if !services.CheckProjectExist(project.ProjectName) {
		if err := services.CreateNewProjectFolders(project.ProjectName); err != nil {
			fmt.Fprintf(os.Stderr, "FBI --> Error creating project folders: %v\n", err)
			http.Error(w, "Failed to create project folders", http.StatusInternalServerError)
			return
		}
	}
	
	apiKeyInRequest := r.Header.Get("x-api-key")
	projectAPIKey, err := services.GetProjectAPIKey(project)
	if err != nil || projectAPIKey != apiKeyInRequest {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"code":    http.StatusUnauthorized,
			"message": fmt.Sprintf("invalid API Key: %s", apiKeyInRequest),
		})
		return
	}

	build, err := services.InitializeBuild(pid, buildVersion, metadata)
	if err != nil {
		fmt.Fprintf(os.Stderr, "FBI --> Error: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("build initialized, BID: %s\n", build.BID)
	
	services.RunComprehensiveCompareAsync(build.BID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"pid":        build.PID,
		"bid":        build.BID,
		"buildIndex": build.BuildIndex,
	})
}

func handleImageUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/slave/images/project-tests/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": "missing 'pid'",
		})
		return
	}
	pid := parts[0]

	project, err := services.GetProjectByPID(pid)
	if err != nil || project == nil || project.ProjectName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": fmt.Sprintf("project pid=%s doesn't exist", pid),
		})
		return
	}
	
	if !services.CheckProjectExist(project.ProjectName) {
		if err := services.CreateNewProjectFolders(project.ProjectName); err != nil {
			fmt.Fprintf(os.Stderr, "FBI --> Error creating project folders: %v\n", err)
			http.Error(w, "Failed to create project folders", http.StatusInternalServerError)
			return
		}
	}
	
	apiKeyInRequest := r.Header.Get("x-api-key")
	projectAPIKey, err := services.GetProjectAPIKey(project)
	if err != nil || projectAPIKey != apiKeyInRequest {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"code":    http.StatusUnauthorized,
			"message": fmt.Sprintf("invalid API Key: %s", apiKeyInRequest),
		})
		return
	}
	
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": "no image",
		})
		return
	}

	if r.MultipartForm == nil || len(r.MultipartForm.File) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": "no image",
		})
		return
	}

	var receivedImages []string

	for fieldName, fileHeaders := range r.MultipartForm.File {
		for _, fileHeader := range fileHeaders {
			fileName := fileHeader.Filename
			if fileName == "" {
				fileName = fieldName
			}

			if !services.IsUploadedScreenshotValid(fileName) {
				fmt.Fprintf(os.Stderr, "FBI -> Error: received image: %s not acceptable\n", fileName)
				writeJSON(w, http.StatusBadRequest, map[string]interface{}{
					"code":    400,
					"message": fmt.Sprintf("invalid filename: %s", fileName),
				})
				return
			}

			fmt.Printf("FBI -> Info: received image: %s\n", fileName)

			destPath := config.ProjectTestImageWithPath(project.ProjectName, fileName)
			if err := saveUploadedFile(fileHeader, destPath); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			receivedImages = append(receivedImages, fileName)
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"code":           200,
		"receivedImages": receivedImages,
	})
}

func saveUploadedFile(fh *multipart.FileHeader, destPath string) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return err
	}

	src, err := fh.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func handleBuildSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": "failed to parse multipart form",
		})
		return
	}
	defer r.MultipartForm.RemoveAll()

	pid := r.FormValue("pid")
	buildVersion := r.FormValue("buildVersion")

	metadata := make(map[string]string)
	for key, values := range r.PostForm {
		if strings.HasPrefix(key, "meta_") && len(values) > 0 {
			metaKey := strings.TrimPrefix(key, "meta_")
			metadata[metaKey] = values[0]
		}
	}

	if pid == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": "missing 'pid'",
		})
		return
	}

	project, err := services.GetProjectByPID(pid)
	if err != nil || project == nil || project.ProjectName == "" {
		errorMessage := fmt.Sprintf("projectId=%s not exist!", pid)
		fmt.Fprintf(os.Stderr, "FBI --> Error: %s\n", errorMessage)
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": errorMessage,
		})
		return
	}

	if !services.CheckProjectExist(project.ProjectName) {
		if err := services.CreateNewProjectFolders(project.ProjectName); err != nil {
			fmt.Fprintf(os.Stderr, "FBI --> Error creating project folders: %v\n", err)
			http.Error(w, "Failed to create project folders", http.StatusInternalServerError)
			return
		}
	}

	apiKeyInRequest := r.Header.Get("x-api-key")
	projectAPIKey, err := services.GetProjectAPIKey(project)
	if err != nil || projectAPIKey != apiKeyInRequest {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"code":    http.StatusUnauthorized,
			"message": fmt.Sprintf("invalid API Key: %s", apiKeyInRequest),
		})
		return
	}

	if r.MultipartForm == nil || len(r.MultipartForm.File) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": "no image",
		})
		return
	}

	var receivedImages []string

	for fieldName, fileHeaders := range r.MultipartForm.File {
		for _, fileHeader := range fileHeaders {
			fileName := fileHeader.Filename
			if fileName == "" {
				fileName = fieldName
			}

			if !services.IsUploadedScreenshotValid(fileName) {
				fmt.Fprintf(os.Stderr, "FBI -> Error: received image: %s not acceptable\n", fileName)
				writeJSON(w, http.StatusBadRequest, map[string]interface{}{
					"code":    400,
					"message": fmt.Sprintf("invalid filename: %s", fileName),
				})
				return
			}

			fmt.Printf("FBI -> Info: received image: %s\n", fileName)

			destPath := config.ProjectTestImageWithPath(project.ProjectName, fileName)
			if err := saveUploadedFile(fileHeader, destPath); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			receivedImages = append(receivedImages, fileName)
		}
	}

	build, err := services.InitializeBuild(pid, buildVersion, metadata)
	if err != nil {
		fmt.Fprintf(os.Stderr, "FBI --> Error: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("build initialized, BID: %s\n", build.BID)

	if err := services.ComprehensiveCompare(project, build); err != nil {
		fmt.Fprintf(os.Stderr, "FBI --> Error: comprehensive compare failed for bid=%s: %v\n", build.BID, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	updatedBuild, err := services.GetBuildByBID(build.BID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"pid":        updatedBuild.PID,
		"bid":        updatedBuild.BID,
		"buildIndex": updatedBuild.BuildIndex,
		"status":     updatedBuild.BuildStatus,
		"result":     updatedBuild.BuildResult,
	})
}

func handleBuildCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pid := r.URL.Query().Get("pid")
	buildVersion := r.URL.Query().Get("buildVersion")

	metadata := make(map[string]string)
	for key, values := range r.URL.Query() {
		if strings.HasPrefix(key, "meta_") && len(values) > 0 {
			metaKey := strings.TrimPrefix(key, "meta_")
			metadata[metaKey] = values[0]
		}
	}

	project, err := services.GetProjectByPID(pid)
	if err != nil || project == nil {
		errorMessage := fmt.Sprintf("projectId=%s not exist!", pid)
		fmt.Fprintf(os.Stderr, "FBI --> Error: %s\n", errorMessage)
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": errorMessage,
		})
		return
	}

	if !services.CheckProjectExist(project.ProjectName) {
		if err := services.CreateNewProjectFolders(project.ProjectName); err != nil {
			fmt.Fprintf(os.Stderr, "FBI --> Error creating project folders: %v\n", err)
			http.Error(w, "Failed to create project folders", http.StatusInternalServerError)
			return
		}
	}

	apiKeyInRequest := r.Header.Get("x-api-key")
	projectAPIKey, err := services.GetProjectAPIKey(project)
	if err != nil || projectAPIKey != apiKeyInRequest {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"code":    http.StatusUnauthorized,
			"message": fmt.Sprintf("invalid API Key: %s", apiKeyInRequest),
		})
		return
	}

	build, err := services.InitializeBuild(pid, buildVersion, metadata)
	if err != nil {
		fmt.Fprintf(os.Stderr, "FBI --> Error: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("build created (staged), BID: %s\n", build.BID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"pid":        build.PID,
		"bid":        build.BID,
		"buildIndex": build.BuildIndex,
	})
}

func handleBuildImageUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/slave/images/build/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": "missing 'bid'",
		})
		return
	}
	bid := parts[0]

	build, err := services.GetBuildByBID(bid)
	if err != nil || build == nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": fmt.Sprintf("build bid=%s doesn't exist", bid),
		})
		return
	}

	project, err := services.GetProjectByPID(build.PID)
	if err != nil || project == nil || project.ProjectName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": fmt.Sprintf("project pid=%s doesn't exist", build.PID),
		})
		return
	}

	if !services.CheckProjectExist(project.ProjectName) {
		if err := services.CreateNewProjectFolders(project.ProjectName); err != nil {
			fmt.Fprintf(os.Stderr, "FBI --> Error creating project folders: %v\n", err)
			http.Error(w, "Failed to create project folders", http.StatusInternalServerError)
			return
		}
	}

	apiKeyInRequest := r.Header.Get("x-api-key")
	projectAPIKey, err := services.GetProjectAPIKey(project)
	if err != nil || projectAPIKey != apiKeyInRequest {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"code":    http.StatusUnauthorized,
			"message": fmt.Sprintf("invalid API Key: %s", apiKeyInRequest),
		})
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": "no image",
		})
		return
	}

	if r.MultipartForm == nil || len(r.MultipartForm.File) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": "no image",
		})
		return
	}

	var receivedImages []string

	for fieldName, fileHeaders := range r.MultipartForm.File {
		for _, fileHeader := range fileHeaders {
			fileName := fileHeader.Filename
			if fileName == "" {
				fileName = fieldName
			}

			if !services.IsUploadedScreenshotValid(fileName) {
				fmt.Fprintf(os.Stderr, "FBI -> Error: received image: %s not acceptable\n", fileName)
				writeJSON(w, http.StatusBadRequest, map[string]interface{}{
					"code":    400,
					"message": fmt.Sprintf("invalid filename: %s", fileName),
				})
				return
			}

			fmt.Printf("FBI -> Info: received image for build %s: %s\n", bid, fileName)

			destPath := config.ProjectBuildStagingImagePath(project.ProjectName, bid, fileName)
			if err := saveUploadedFile(fileHeader, destPath); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			receivedImages = append(receivedImages, fileName)
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"code":           200,
		"receivedImages": receivedImages,
	})
}

func handleBuildFinalize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	bid := r.URL.Query().Get("bid")
	if bid == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": "missing 'bid'",
		})
		return
	}

	build, err := services.GetBuildByBID(bid)
	if err != nil || build == nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": fmt.Sprintf("build bid=%s doesn't exist", bid),
		})
		return
	}

	project, err := services.GetProjectByPID(build.PID)
	if err != nil || project == nil {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"code":    400,
			"message": fmt.Sprintf("project pid=%s doesn't exist", build.PID),
		})
		return
	}

	apiKeyInRequest := r.Header.Get("x-api-key")
	projectAPIKey, err := services.GetProjectAPIKey(project)
	if err != nil || projectAPIKey != apiKeyInRequest {
		writeJSON(w, http.StatusUnauthorized, map[string]interface{}{
			"code":    http.StatusUnauthorized,
			"message": fmt.Sprintf("invalid API Key: %s", apiKeyInRequest),
		})
		return
	}

	fmt.Printf("build finalize (staged), BID: %s\n", build.BID)

	services.RunComprehensiveCompareStagedAsync(build.BID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"pid":        build.PID,
		"bid":        build.BID,
		"buildIndex": build.BuildIndex,
	})
}
