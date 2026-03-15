package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Ignoring struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	PID        string             `bson:"pid" json:"pid"`
	CaseName   string             `bson:"caseName" json:"caseName"`
	Rectangles []Rectangle        `bson:"rectangles" json:"rectangles"`
}
