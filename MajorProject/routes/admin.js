const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const Booking = require("../models/booking.js");
const wrapAsync = require("../utils/wrapAsync.js");
const {isAdmin} = require("../middleware.js");

router.get("/", isAdmin, wrapAsync(async (req, res) => {
    const [users, listings, reviews, bookings, revenue] = await Promise.all([
        User.countDocuments(),
        Listing.countDocuments(),
        Review.countDocuments(),
        Booking.countDocuments(),
        Booking.aggregate([{$group: {_id: null, total: {$sum: "$totalPrice"}}}]),
    ]);
    const recentBookings = await Booking.find()
        .populate("listing guest")
        .sort({createdAt: -1})
        .limit(8);
    res.render("admin/dashboard.ejs", {
        stats: {users, listings, reviews, bookings, revenue: revenue[0]?.total || 0},
        recentBookings,
    });
}));

module.exports = router;
