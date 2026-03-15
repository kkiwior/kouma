package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Build struct {
	ID                                  primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	PID                                 string             `bson:"pid" json:"pid"`
	BID                                 string             `bson:"bid" json:"bid"`
	BuildResult                         string             `bson:"buildResult" json:"buildResult"`
	BuildStatus                         string             `bson:"buildStatus" json:"buildStatus"`
	BuildVersion                        string             `bson:"buildVersion" json:"buildVersion"`
	BuildIndex                          int                `bson:"buildIndex" json:"buildIndex"`
	CaseCount                           int                `bson:"caseCount" json:"caseCount"`
	IsBaseline                          bool               `bson:"isBaseline" json:"isBaseline"`
	CreatedAt                           time.Time          `bson:"createdAt" json:"createdAt"`
	CaseFailedCount                     int                `bson:"caseFailedCount" json:"caseFailedCount"`
	CasePassedCount                     int                `bson:"casePassedCount" json:"casePassedCount"`
	CaseUndeterminedCount               int                `bson:"caseUndeterminedCount" json:"caseUndeterminedCount"`
	CasePassedByIgnoringRectanglesCount int                `bson:"casePassedByIgnoringRectanglesCount" json:"casePassedByIgnoringRectanglesCount"`
	Metadata                            map[string]string  `bson:"metadata,omitempty" json:"metadata,omitempty"`
}
