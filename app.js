const { MongoClient } = require('mongodb');

// Connection URI for the local Docker replica set
const uri = "mongodb://localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to the replica set");
    const db = client.db("biologyDB");

    // 1. Input Validation: Create collection with schema validation for 'species'
    try {
      await db.createCollection("species", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["commonName", "scientificName", "population"],
            properties: {
              commonName: { bsonType: "string", description: "must be a string and is required" },
              scientificName: { bsonType: "string", description: "must be a string and is required" },
              population: { bsonType: "int", minimum: 0, description: "must be an integer >= 0 and is required" }
            }
          }
        }
      });
      console.log("Collection 'species' created with validation rules.");
    } catch (e) {
      console.log("Collection 'species' already exists. Proceeding...");
    }

    const speciesCollection = db.collection("species");

    // 2. CREATE (Write with w:1)
    const startTimeW1 = Date.now();
    await speciesCollection.insertOne(
      { commonName: "Tiger", scientificName: "Panthera tigris", population: 3900 },
      { writeConcern: { w: 1 } }
    );
    console.log(`w:1 Write took ${Date.now() - startTimeW1} ms`);

    // 3. CREATE (Write with w:'majority')
    const startTimeWMajority = Date.now();
    await speciesCollection.insertOne(
      { commonName: "Blue Whale", scientificName: "Balaenoptera musculus", population: 25000 },
      { writeConcern: { w: "majority" } }
    );
    console.log(`w:'majority' Write took ${Date.now() - startTimeWMajority} ms`);

    // 4. READ (Full CRUD)
    console.log("\nReading species...");
    const allSpecies = await speciesCollection.find({}).toArray();
    console.log(allSpecies);

    // 5. UPDATE (Full CRUD)
    console.log("\nUpdating Blue Whale population...");
    await speciesCollection.updateOne(
      { commonName: "Blue Whale" },
      { $set: { population: 26000 } }
    );
    console.log("Update successful.");

    // 6. DELETE (Full CRUD)
    console.log("\nDeleting Tiger...");
    await speciesCollection.deleteOne({ commonName: "Tiger" });
    console.log("Deletion successful.");

    console.log("\nAll CRUD operations completed successfully.");

  } finally {
    await client.close();
  }
}

run().catch(console.dir);