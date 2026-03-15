package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Rectangle struct {
	X      float64 `bson:"x" json:"x"`
	Y      float64 `bson:"y" json:"y"`
	Width  float64 `bson:"width" json:"width"`
	Height float64 `bson:"height" json:"height"`
}

type Case struct {
	ID                      primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	PID                     string             `bson:"pid" json:"pid"`
	BID                     string             `bson:"bid" json:"bid"`
	CID                     string             `bson:"cid" json:"cid"`
	CaseName                string             `bson:"caseName" json:"caseName"`
	DiffPercentage          *float64           `bson:"diffPercentage" json:"diffPercentage"`
	CaseResult              string             `bson:"caseResult" json:"caseResult"`
	LinkBaseline            string             `bson:"linkBaseline" json:"linkBaseline"`
	LinkLatest              string             `bson:"linkLatest" json:"linkLatest"`
	LinkDiff                string             `bson:"linkDiff" json:"linkDiff"`
	IgnoringRectangles      []Rectangle        `bson:"ignoringRectangles" json:"ignoringRectangles"`
	ComprehensiveCaseResult *string            `bson:"comprehensiveCaseResult" json:"comprehensiveCaseResult"`
	CreatedAt               time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt               time.Time          `bson:"updatedAt" json:"updatedAt"`
}
