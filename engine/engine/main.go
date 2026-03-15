package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"kouma-engine/config"
	"kouma-engine/routes"
	"kouma-engine/utils"
)

func main() {
	config.Init()

	if err := os.MkdirAll("screenshots", 0755); err != nil {
		log.Fatalf("Failed to create screenshots directory: %v", err)
	}

	if err := utils.ConnectDB(config.MongoDBURL, config.MongoDBName); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	utils.EnsureIndexes()

	mux := http.NewServeMux()
	routes.SetupRoutes(mux)

	handler := loggingMiddleware(mux)

	addr := ":" + config.Port
	fmt.Printf("Engine listening on port %s\n", config.Port)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Printf("%s %s %s\n", r.Method, r.URL.Path, r.RemoteAddr)
		next.ServeHTTP(w, r)
	})
}
