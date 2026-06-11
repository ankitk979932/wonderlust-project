require("dotenv").config();
const mongoose = require("mongoose");
const initData = require("./init/data.js");
const Listing = require("./models/listing.js");
const User = require("./models/user.js");
const Review = require("./models/review.js");
const Booking = require("./models/booking.js");

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
    console.error("❌ MONGO_URL not found in environment variables!");
    process.exit(1);
}

async function seedDatabase() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("✅ Connected to MongoDB Atlas");

        // Clear existing data
        await Listing.deleteMany({});
        await Review.deleteMany({});
        await Booking.deleteMany({});
        console.log("🗑️  Cleared existing data");

        // Create demo user
        let demoUser = await User.findOne({ username: "demo" });
        if (!demoUser) {
            demoUser = await User.register(
                new User({ username: "demo", email: "demo@wanderlust.com" }),
                "demo1234"
            );
            console.log("✅ Demo user created");
        }

        // Add owner to listings
        const listingsWithOwner = initData.sampleListings.map((listing) => ({
            ...listing,
            owner: demoUser._id,
        }));

        // Insert listings
        await Listing.insertMany(listingsWithOwner);
        console.log(`✅ ${listingsWithOwner.length} listings inserted!`);

        await mongoose.connection.close();
        console.log("✅ Database seeding complete!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error.message);
        process.exit(1);
    }
}

seedDatabase();
