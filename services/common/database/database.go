package database

import (
	"context"
	"log"
	"net/url"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type DB struct {
	Timeout time.Duration

	Monitors *mongo.Collection
	Results  *mongo.Collection
	client   *mongo.Client

	WatchSupported bool
}

func ConnectToDB() *DB {
	db := &DB{}

	timeoutEnv := os.Getenv("MONGO_TIMEOUT")
	if timeoutEnv == "" {
		timeoutEnv = "30s"
	}

	db.Timeout, _ = time.ParseDuration(timeoutEnv)

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	var err error

	url, err := url.Parse(mongoURI)
	if err == nil {
		log.Printf("### Connecting to: %s:%s", url.Hostname(), url.Port())
	}

	mongoDB := os.Getenv("MONGO_DB")
	if mongoDB == "" {
		mongoDB = "nanomon"
	}

	ctx, cancel := context.WithTimeout(context.Background(), db.Timeout)
	defer cancel()

	db.client, err = mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalln("### FATAL! MongoDB client error", err.Error())
	}

	err = db.client.Ping(ctx, readpref.Primary())
	if err != nil {
		log.Fatalln("### FATAL! Failed to open MongoDB: ", err)
	} else {
		log.Println("### Connected to MongoDB ok!")
	}

	_ = db.client.Database(mongoDB).CreateCollection(ctx, "monitors")
	_ = db.client.Database(mongoDB).CreateCollection(ctx, "results")

	db.Monitors = db.client.Database(mongoDB).Collection("monitors")
	db.Results = db.client.Database(mongoDB).Collection("results")

	// Check if change streams are supported, by default we assume they are
	// There's no real way to check this, so we'll just check if we're using CosmosDB
	db.WatchSupported = true
	if strings.Contains(mongoURI, "cosmos.azure.com") {
		db.WatchSupported = false
	}

	// Allow override with env var
	if os.Getenv("USE_POLLING") == "true" {
		db.WatchSupported = false
	}

	return db
}

func (db DB) Ping() error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*2)
	defer cancel()

	err := db.client.Ping(ctx, readpref.Primary())
	if err != nil {
		return err
	}

	return nil
}

func (db DB) Close() {
	if db.client == nil {
		return
	}

	err := db.client.Disconnect(context.TODO())
	if err != nil {
		log.Fatal(err)
	}
}
