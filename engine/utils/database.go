package utils

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	MongoClient *mongo.Client
	MongoDB     *mongo.Database
)

func ConnectDB(mongoURL, dbName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().ApplyURI(mongoURL)
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return fmt.Errorf("connecting to MongoDB: %w", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		return fmt.Errorf("pinging MongoDB: %w", err)
	}

	MongoClient = client
	MongoDB = client.Database(dbName)

	fmt.Println("Connected to MongoDB")
	return nil
}

func GetCollection(name string) *mongo.Collection {
	return MongoDB.Collection(name)
}

func EnsureIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	projects := GetCollection("projects")
	_, err := projects.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "pid", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "projectName", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
	})
	if err != nil {
		log.Printf("Failed to create indexes for projects: %v", err)
	}

	builds := GetCollection("builds")
	_, err = builds.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "bid", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "pid", Value: 1}},
		},
	})
	if err != nil {
		log.Printf("Failed to create indexes for builds: %v", err)
	}

	cases := GetCollection("cases")
	_, err = cases.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "cid", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "bid", Value: 1}},
		},
	})
	if err != nil {
		log.Printf("Failed to create indexes for cases: %v", err)
	}

	ignorings := GetCollection("ignorings")
	_, err = ignorings.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "pid", Value: 1}, {Key: "caseName", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		log.Printf("Failed to create index for ignorings: %v", err)
	}

	webhooks := GetCollection("webhooks")
	_, err = webhooks.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "wid", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "pid", Value: 1}},
		},
	})
	if err != nil {
		log.Printf("Failed to create indexes for webhooks: %v", err)
	}
}
