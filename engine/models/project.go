package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Project struct {
	ID                         primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	PID                        string             `bson:"pid" json:"pid"`
	APIKey                     string             `bson:"apiKey" json:"apiKey"`
	ProjectName                string             `bson:"projectName" json:"projectName"`
	ProjectDisplayName         string             `bson:"projectDisplayName" json:"projectDisplayName"`
	ProjectImageURL            string             `bson:"projectImageUrl" json:"projectImageUrl"`
	SharedProjectRootPath      string             `bson:"sharedProjectRootPath" json:"sharedProjectRootPath"`
	ProjectColorThreshold      float64            `bson:"projectColorThreshold" json:"projectColorThreshold"`
	ProjectDetectAntialiasing  bool               `bson:"projectDetectAntialiasing" json:"projectDetectAntialiasing"`
	ProjectIgnoringCluster     bool               `bson:"projectIgnoringCluster" json:"projectIgnoringCluster"`
	ProjectIgnoringClusterSize int                `bson:"projectIgnoringClusterSize" json:"projectIgnoringClusterSize"`
	PreserveIgnoringOnRebase   bool               `bson:"preserveIgnoringOnRebase" json:"preserveIgnoringOnRebase"`
	RetentionPolicyType        string             `bson:"retentionPolicyType,omitempty" json:"retentionPolicyType,omitempty"`
	RetentionPolicyValue       int                `bson:"retentionPolicyValue,omitempty" json:"retentionPolicyValue,omitempty"`
	CreatedAt                  time.Time          `bson:"createdAt" json:"createdAt"`
}
