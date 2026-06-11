const express = require("express");
const router = express.Router();
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const ExpressError = require("../utils/ExpressError.js");
const wrapAsync = require("../utils/wrapAsync.js");
const {isLoggedIn} = require("../middleware.js");

router.get("/", isLoggedIn, wrapAsync(async (req, res) => {
    const user = await User.findById(req.user._id).populate("wishlist");
    res.render("wishlist/index.ejs", {listings: user.wishlist});
}));

router.post("/:id", isLoggedIn, wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, "Listing does not exist");
    }

    const user = await User.findById(req.user._id);
    const saved = user.wishlist.some((id) => id.equals(listing._id));
    if (saved) {
        user.wishlist.pull(listing._id);
        req.flash("success", "Removed from wishlist");
    } else {
        user.wishlist.push(listing._id);
        req.flash("success", "Saved to wishlist");
    }
    await user.save();
    res.redirect(req.get("referer") || "/wishlist");
}));

module.exports = router;
