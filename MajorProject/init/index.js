require("dotenv").config({quiet: true});
const mongoose = require("mongoose")
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Review = require("../models/review.js");
const Booking = require("../models/booking.js");


const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("connected to DB");
        await initDB();
    } finally {
        await mongoose.connection.close();
    }
}

const initDB = async () => {
    await Listing.deleteMany({});
    await Review.deleteMany({});
    await Booking.deleteMany({});
    let demoUser = await User.findOne({username: "demo"});
    if (!demoUser) {
        demoUser = await User.register(
            new User({username: "demo", email: "demo@wanderlust.com"}),
            "demo1234"
        );
    }
    demoUser.isAdmin = true;
    demoUser.wishlist = [];
    await demoUser.save();
    const listings = initData.data.map((listing) => ({
        ...listing,
        owner: demoUser._id,
    }));
    await Listing.insertMany(listings);
    console.log("data was initialized");
};

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
