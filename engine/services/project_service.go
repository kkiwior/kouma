package services

import (
	"context"
	"fmt"

	"kouma-engine/models"
	"kouma-engine/utils"

	"go.mongodb.org/mongo-driver/bson"
)

func GetProjectByPID(pid string) (*models.Project, error) {
	coll := utils.GetCollection("projects")
	var project models.Project
	err := coll.FindOne(context.Background(), bson.M{"pid": pid}).Decode(&project)
	if err != nil {
		return nil, fmt.Errorf("finding project by pid=%s: %w", pid, err)
	}
	return &project, nil
}

func GetSharedProjectRootPath(projectName string) (string, error) {
	coll := utils.GetCollection("projects")
	var project models.Project
	err := coll.FindOne(context.Background(), bson.M{"projectName": projectName}).Decode(&project)
	if err != nil {
		return "", err
	}
	return project.SharedProjectRootPath, nil
}

func GetProjectAPIKey(project *models.Project) (string, error) {
	return utils.DecryptAPIKey(project.APIKey)
}
