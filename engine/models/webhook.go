package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Webhook struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	WID             string             `bson:"wid" json:"wid"`
	PID             string             `bson:"pid" json:"pid"`
	Name            string             `bson:"name" json:"name"`
	URL             string             `bson:"url" json:"url"`
	Method          string             `bson:"method" json:"method"`
	ContentType     string             `bson:"contentType" json:"contentType"`
	Condition       string             `bson:"condition" json:"condition"`
	PayloadTemplate string             `bson:"payloadTemplate" json:"payloadTemplate"`
	Headers         map[string]string  `bson:"headers,omitempty" json:"headers,omitempty"`
	Enabled         bool               `bson:"enabled" json:"enabled"`
	CreatedAt       time.Time          `bson:"createdAt" json:"createdAt"`
}
