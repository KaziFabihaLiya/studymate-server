const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = 5000;

//Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173", 
      "http://localhost:3000", 
      "https://studymate-auth-firebase.web.app", 
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8ev9gxa.mongodb.net/?appName=Cluster0`;

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
    const partnerRequestsCol = DB.collection("partnerRequests");

    // app.get("/AllPartnerProfile", async (req, res) => {
    //   const { sortOrder = "desc", search = "" } = req.query;
    //   let result = await profileCol.find().toArray();

    //   // Filter by search if provided
    //   if (search.trim()) {
    //     result = result.filter((partner) =>
    //       partner.subject.toLowerCase().includes(search.trim().toLowerCase())
    //     );
    //   }

    //   // Add numeric experience level
    //   result = result.map((partner) => ({
    //     ...partner,
    //     expLevelNum:
    //       partner.experienceLevel === "Beginner"
    //         ? 1
    //         : partner.experienceLevel === "Intermediate"
    //         ? 2
    //         : partner.experienceLevel === "Advanced"
    //         ? 3
    //         : partner.experienceLevel === "Expert"
    //         ? 4
    //         : 0,
    //   }));

    //   // Sort by expLevelNum
    //   const direction = sortOrder === "asc" ? 1 : -1;
    //   result.sort((a, b) => direction * (a.expLevelNum - b.expLevelNum));

    //   // Remove temp field
    //   result = result.map(({ expLevelNum, ...rest }) => rest);

    //   console.log(result);
    //   res.send(result);
    // });

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
      console.log(`Fetching profile for ID: ${req.params.id}`);
      const { id } = req.params;
      let result = null;

      try {
       
        const objectId = new ObjectId(id);
        result = await profileCol.findOne({ _id: objectId });
        console.log("ObjectId query result:", result ? "Found" : "Not found");
      } catch (err) {
        console.log("Invalid ObjectId, trying string query:", err.message);
      }

      
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


    // Add these new endpoints to your existing index.js

// Get dashboard statistics for a user
app.get("/dashboard-stats", async (req, res) => {
  const email = req.query.email;

  try {
    // Get user's profiles
    const userProfiles = await profileCol.find({ email: email }).toArray();

    // Get user's partner requests
    const requests = await partnerRequestsCol
      .find({ userEmail: email })
      .toArray();

    // Calculate total connections
    const totalConnections = userProfiles.reduce(
      (sum, profile) => sum + (profile.partnerCount || 0),
      0
    );

    // Calculate total views (you can implement view tracking)
    const totalViews = userProfiles.reduce(
      (sum, profile) => sum + (profile.views || 0),
      0
    );

    res.send({
      success: true,
      stats: {
        totalProfiles: userProfiles.length,
        totalRequests: requests.length,
        totalConnections: totalConnections,
        profileViews: totalViews,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).send({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    });
  }
});

// Get admin statistics (all platform data)
app.get("/admin-stats", async (req, res) => {
  try {
    // Get all profiles
    const allProfiles = await profileCol.find().toArray();

    // Get unique users
    const uniqueEmails = [...new Set(allProfiles.map((p) => p.email))];

    // Calculate total connections
    const totalConnections = allProfiles.reduce(
      (sum, profile) => sum + (profile.partnerCount || 0),
      0
    );

    // Get all partner requests
    const allRequests = await partnerRequestsCol.find().toArray();

    // Subject distribution
    const subjectCounts = {};
    allProfiles.forEach((profile) => {
      const subject = profile.subject || "Other";
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    });

    // Experience level distribution
    const experienceCounts = {
      Beginner: 0,
      Intermediate: 0,
      Advanced: 0,
      Expert: 0,
    };

    allProfiles.forEach((profile) => {
      if (experienceCounts.hasOwnProperty(profile.experienceLevel)) {
        experienceCounts[profile.experienceLevel]++;
      }
    });

    // Study mode distribution
    const modeCounts = {
      Online: 0,
      Offline: 0,
      Hybrid: 0,
    };

    allProfiles.forEach((profile) => {
      if (modeCounts.hasOwnProperty(profile.studyMode)) {
        modeCounts[profile.studyMode]++;
      }
    });

    res.send({
      success: true,
      stats: {
        totalUsers: uniqueEmails.length,
        totalProfiles: allProfiles.length,
        totalConnections: totalConnections,
        totalRequests: allRequests.length,
      },
      distributions: {
        subjects: subjectCounts,
        experience: experienceCounts,
        modes: modeCounts,
      },
      recentProfiles: allProfiles.slice(-10).reverse(),
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).send({
      success: false,
      message: "Error fetching admin statistics",
      error: error.message,
    });
  }
});

// Track profile views (optional enhancement)
app.post("/track-view/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const objectId = new ObjectId(id);
    const result = await profileCol.updateOne(
      { _id: objectId },
      { $inc: { views: 1 } }
    );

    res.send({
      success: true,
      message: "View tracked successfully",
      result,
    });
  } catch (error) {
    console.error("Error tracking view:", error);
    res.status(500).send({
      success: false,
      message: "Error tracking view",
      error: error.message,
    });
  }
});

// Get all users (admin only)
app.get("/all-users", async (req, res) => {
  try {
    const allProfiles = await profileCol.find().toArray();

    // Group by email to get unique users
    const usersMap = new Map();

    allProfiles.forEach((profile) => {
      if (!usersMap.has(profile.email)) {
        usersMap.set(profile.email, {
          email: profile.email,
          name: profile.name,
          profileCount: 1,
          totalConnections: profile.partnerCount || 0,
          lastActive: profile.createdAt || new Date(),
        });
      } else {
        const user = usersMap.get(profile.email);
        user.profileCount++;
        user.totalConnections += profile.partnerCount || 0;
      }
    });

    const users = Array.from(usersMap.values());

    res.send({
      success: true,
      users,
      total: users.length,
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).send({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
});

// Enhanced AllPartnerProfile with filters (Update existing endpoint)
app.get("/AllPartnerProfile", async (req, res) => {
  const {
    sortOrder = "desc",
    search = "",
    mode = "",
    experience = "",
    availability = "",
  } = req.query;

  try {
    let result = await profileCol.find().toArray();

    // Filter by search if provided
    if (search.trim()) {
      result = result.filter((partner) =>
        partner.subject.toLowerCase().includes(search.trim().toLowerCase())
      );
    }

    // Filter by study mode
    if (mode) {
      result = result.filter((partner) => partner.studyMode === mode);
    }

    // Filter by experience level
    if (experience) {
      result = result.filter((partner) => partner.experienceLevel === experience);
    }

    // Filter by availability
    if (availability) {
      result = result.filter((partner) =>
        partner.availability
          ?.toLowerCase()
          .includes(availability.toLowerCase())
      );
    }

    // Add numeric experience level
    result = result.map((partner) => ({
      ...partner,
      expLevelNum:
        partner.experienceLevel === "Beginner"
          ? 1
          : partner.experienceLevel === "Intermediate"
          ? 2
          : partner.experienceLevel === "Advanced"
          ? 3
          : partner.experienceLevel === "Expert"
          ? 4
          : 0,
    }));

    // Sort by expLevelNum
    const direction = sortOrder === "asc" ? 1 : -1;
    result.sort((a, b) => direction * (a.expLevelNum - b.expLevelNum));

    // Remove temp field
    result = result.map(({ expLevelNum, ...rest }) => rest);

    res.send(result);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).send([]);
  }
});

    // NEW ENDPOINT: Send Partner Request
    app.post("/sendPartnerRequest", async (req, res) => {
      const { partnerId, userEmail } = req.body;

      try {
        console.log("Received partner request:", { partnerId, userEmail });

        // Validate input
        if (!partnerId || !userEmail) {
          return res.status(400).send({
            success: false,
            message: "Partner ID and user email are required",
          });
        }

        
        const existingRequest = await partnerRequestsCol.findOne({
          partnerId: partnerId,
          userEmail: userEmail,
        });

        if (existingRequest) {
          return res.status(400).send({
            success: false,
            message: "You have already sent a request to this partner",
          });
        }

        // Get partner profile details
        let partnerProfile = null;
        try {
          const objectId = new ObjectId(partnerId);
          partnerProfile = await profileCol.findOne({ _id: objectId });
        } catch (err) {
          partnerProfile = await profileCol.findOne({ _id: partnerId });
        }

        if (!partnerProfile) {
          return res.status(404).send({
            success: false,
            message: "Partner profile not found",
          });
        }

        console.log("Found partner profile:", partnerProfile.name);

        // Increment partner count using $inc operator
        let updateResult;
        try {
          const objectId = new ObjectId(partnerId);
          updateResult = await profileCol.updateOne(
            { _id: objectId },
            { $inc: { partnerCount: 1 } }
          );
        } catch (err) {
          updateResult = await profileCol.updateOne(
            { _id: partnerId },
            { $inc: { partnerCount: 1 } }
          );
        }

        console.log("Update result:", updateResult);


        const requestData = {
          partnerId: partnerId,
          partnerName: partnerProfile.name,
          partnerEmail: partnerProfile.email,
          partnerSubject: partnerProfile.subject,
          partnerProfileImage: partnerProfile.profileimage,
          userEmail: userEmail,
          requestDate: new Date(),
          status: "pending",
        };

        const insertResult = await partnerRequestsCol.insertOne(requestData);
        console.log("Insert result:", insertResult);

        res.send({
          success: true,
          message: "Partner request sent successfully",
          data: {
            requestId: insertResult.insertedId,
            updatedCount: updateResult.modifiedCount,
          },
        });
      } catch (error) {
        console.error("Error sending partner request:", error);
        res.status(500).send({
          success: false,
          message: "Error sending partner request",
          error: error.message,
        });
      }
    });

    // Get partner requests for a user
    app.get("/myPartnerRequests", async (req, res) => {
      const email = req.query.email;
      try {
        const result = await partnerRequestsCol
          .find({ userEmail: email })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching partner requests:", error);
        res.status(500).send({
          success: false,
          message: "Error fetching partner requests",
          error: error.message,
        });
      }
    });

    //await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Start the server after DB connection
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
  }
}

// Root route (outside run function)
app.get("/", (req, res) => {
  res.send("Hello StudyMate!");
});

run().catch(console.dir);
