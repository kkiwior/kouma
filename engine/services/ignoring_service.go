package services

import (
	"context"

	"kouma-engine/models"
	"kouma-engine/utils"

	"go.mongodb.org/mongo-driver/bson"
)

type PlainIgnoring struct {
	PID        string             `json:"pid"`
	CaseName   string             `json:"caseName"`
	Rectangles []models.Rectangle `json:"rectangles"`
}

func GetPlainIgnoring(pid, caseName string) (*PlainIgnoring, error) {
	coll := utils.GetCollection("ignorings")

	var ignoring models.Ignoring
	err := coll.FindOne(context.Background(), bson.M{"pid": pid, "caseName": caseName}).Decode(&ignoring)
	if err != nil {
		return nil, nil
	}

	rectangles := make([]models.Rectangle, len(ignoring.Rectangles))
	for i, r := range ignoring.Rectangles {
		rectangles[i] = models.Rectangle{
			X:      r.X,
			Y:      r.Y,
			Width:  r.Width,
			Height: r.Height,
		}
	}

	return &PlainIgnoring{
		PID:        ignoring.PID,
		CaseName:   ignoring.CaseName,
		Rectangles: rectangles,
	}, nil
}

func GetPlainIgnorings(pid string, caseNames []string) (map[string]*PlainIgnoring, error) {
	coll := utils.GetCollection("ignorings")

	filter := bson.M{
		"pid":      pid,
		"caseName": bson.M{"$in": caseNames},
	}

	cursor, err := coll.Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	result := make(map[string]*PlainIgnoring)
	for cursor.Next(context.Background()) {
		var ignoring models.Ignoring
		if err := cursor.Decode(&ignoring); err != nil {
			return nil, err
		}

		rectangles := make([]models.Rectangle, len(ignoring.Rectangles))
		for i, r := range ignoring.Rectangles {
			rectangles[i] = models.Rectangle{X: r.X, Y: r.Y, Width: r.Width, Height: r.Height}
		}

		result[ignoring.CaseName] = &PlainIgnoring{PID: ignoring.PID, CaseName: ignoring.CaseName, Rectangles: rectangles}
	}

	return result, cursor.Err()
}
