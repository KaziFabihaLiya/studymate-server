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
    const testimonialCol = DB.collection("testimonials");

    app.get("/AllPartnerProfile", async (req, res) => {
      const result = await profileCol.find().toArray();
      console.log(result);
      res.send(result);
    });
    app.get("/testimonials", async (req, res) => {
      const result = await testimonialCol.find().toArray();
      console.log(result);
      res.send(result);
    });
    app.get("/top-rated", async (req, res) => {
      const result = await profileCol
        .find()
        .sort({ rating: -1 })
        .limit(3)
        .toArray();
      console.log(result);
      res.send(result);
    });
    app.post("/createProfile", async (req, res) => {
      const data = req.body;
      const result = await profileCol.insertOne(data);
      console.log("created prof", result);
      res.send(result);
    });

    app.get("/profileDetails/:id", async (req, res) => {
      console.log(`Fetching profile for ID: ${req.params.id}`); // Debug
      const { id } = req.params;
      let result = null;

      try {
        // Try ObjectId first (for auto-generated IDs)
        const objectId = new ObjectId(id);
        result = await profileCol.findOne({ _id: objectId });
        console.log("ObjectId query result:", result ? "Found" : "Not found");
      } catch (err) {
        console.log("Invalid ObjectId, trying string query:", err.message);
      }

      // Fallback: If no result or invalid ObjectId, try as string
      if (!result) {
        result = await profileCol.findOne({ _id: id });
        console.log("String query result:", result ? "Found" : "Not found");
      }

      res.send({
        success: true,
        result,
      });
    });

    // UPDATE Profile
    app.put("/updateProfile/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      try {
        const objectId = new ObjectId(id);
        const result = await profileCol.updateOne(
          { _id: objectId },
          { $set: updatedData }
        );

        if (result.modifiedCount > 0) {
          res.send({
            success: true,
            message: "Profile updated successfully",
            result,
          });
        } else {
          res.send({
            success: false,
            message: "No changes made or profile not found",
          });
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).send({
          success: false,
          message: "Error updating profile",
          error: error.message,
        });
      }
    });

    // DELETE Profile
    app.delete("/deleteProfile/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const objectId = new ObjectId(id);
        const result = await profileCol.deleteOne({ _id: objectId });

        if (result.deletedCount > 0) {
          res.send({
            success: true,
            message: "Profile deleted successfully",
            result,
          });
        } else {
          res.send({
            success: false,
            message: "Profile not found",
          });
        }
      } catch (error) {
        console.error("Error deleting profile:", error);
        res.status(500).send({
          success: false,
          message: "Error deleting profile",
          error: error.message,
        });
      }
    });
    app.get("/my-profiles", async (req, res) => {
      const email = req.query.email;
      const result = await profileCol.find({ email: email }).toArray();
      res.send(result);
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
