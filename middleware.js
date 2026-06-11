const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const ExpressError = require("./utils/ExpressError.js");

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in first");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

module.exports.isOwner = async (req, res, next) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, "Listing does not exist");
    }
    if (!res.locals.currentUser.isAdmin && (!listing.owner || !listing.owner.equals(res.locals.currentUser._id))) {
        req.flash("error", "You are not allowed to change this listing");
        return res.redirect(`/listings/${req.params.id}`);
    }
    next();
};

module.exports.isAdmin = (req, res, next) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
        req.flash("error", "Admin access required");
        return res.redirect("/listings");
    }
    next();
};

module.exports.isReviewAuthor = async (req, res, next) => {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
        throw new ExpressError(404, "Review does not exist");
    }
    if (!res.locals.currentUser.isAdmin && (!review.author || !review.author.equals(res.locals.currentUser._id))) {
        req.flash("error", "You are not allowed to delete this review");
        return res.redirect(`/listings/${req.params.id}`);
    }
    next();
};
