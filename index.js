const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = 5000;

//Middleware
app.use(cors());
app.use(express.json());

//const uri ="mongodb+srv://StudyMateAdmin:Em9TJ5RZFm6Txu1M@cluster0.8ev9gxa.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const DB = client.db("StudyMateDB");
    const profileCol = DB.collection("partnerProfiles");

    app.get("/AllPartnerProfile", async (req, res) => {
      const result = await profileCol.find().toArray();
      console.log(result);
      res.send(result);
    });
    app.post("/createProfile", async (req, res) => {
      const data = req.body;
      const result = await profileCol.insertOne(data);
      console.log("created prof",result);
      res.send(result);
    });

    app.get("/profileDetails/:id", async (req, res) => {
        console.log(`Fetching profile for ID: ${req.params.id}`); // Debug
        const { id } = req.params;
        const objectId = new ObjectId(id);
        const result = await profileCol.findOne({ _id: objectId });
        res.send({
          success: true,
          result,
        });

    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello StudyMate!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
