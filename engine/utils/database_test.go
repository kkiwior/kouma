package utils

import (
	"go.mongodb.org/mongo-driver/bson"
	"testing"

	"go.mongodb.org/mongo-driver/mongo/integration/mtest"
)

func TestGetCollection(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))

	mt.Run("returns collection", func(mt *mtest.T) {
		MongoDB = mt.Client.Database("micoo")

		coll := GetCollection("builds")
		if coll == nil {
			t.Fatal("expected non-nil collection")
		}
		if coll.Name() != "builds" {
			t.Errorf("expected collection name 'builds', got %q", coll.Name())
		}
	})

	mt.Run("different collection names", func(mt *mtest.T) {
		MongoDB = mt.Client.Database("micoo")

		for _, name := range []string{"projects", "cases", "ignorings"} {
			coll := GetCollection(name)
			if coll == nil {
				t.Fatalf("expected non-nil collection for %q", name)
			}
			if coll.Name() != name {
				t.Errorf("expected collection name %q, got %q", name, coll.Name())
			}
		}
	})
}

func TestEnsureIndexes(t *testing.T) {
	mt := mtest.New(t, mtest.NewOptions().ClientType(mtest.Mock))
	mt.Run("creates indexes successfully", func(mt *mtest.T) {
		MongoClient = mt.Client
		MongoDB = mt.DB

		mt.AddMockResponses(
			bson.D{{Key: "ok", Value: 1}}, 
			bson.D{{Key: "ok", Value: 1}}, 
			bson.D{{Key: "ok", Value: 1}}, 
		)

		EnsureIndexes()

		if MongoClient == nil || MongoDB == nil {
			t.Errorf("MongoDB connection instances should be set")
		}
	})
}
