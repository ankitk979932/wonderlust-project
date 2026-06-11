const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js")
const ExpressError = require("../utils/ExpressError.js")
const {listingSchema} = require("../schema.js")
const Listing = require("../models/listing.js")
const {isLoggedIn, isOwner} = require("../middleware.js");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


const validateListing = (req, res, next) => {
    const {error} = listingSchema.validate(req.body);
    
    if(error){
        const message = error.details.map((detail) => detail.message).join(", ");
        throw new ExpressError(400, message)
    }else{
        next();
    }
}





//Index Route
router.get("/", wrapAsync(async (req, res) => {
    const query = req.query.q?.trim();
    const search = query ? escapeRegex(query) : "";
    const filter = query
        ? {
            $or: [
                {title: {$regex: search, $options: "i"}},
                {location: {$regex: search, $options: "i"}},
                {country: {$regex: search, $options: "i"}},
            ],
        }
        : {};
    const allListings = await Listing.find(filter);
    res.render("./listings/index.ejs", {allListings, query})

}))

//New Route
router.get("/new", isLoggedIn, (req, res) => {
    
    res.render("./listings/new.ejs")
})

//Show Route
router.get("/:id", wrapAsync(async (req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id)
        .populate("owner")
        .populate({path: "reviews", populate: {path: "author"}});
    if(!listing) {
        req.flash("error", "Listing you requested for does not exist");
        return res.redirect("/listings");
    }
    res.render("./listings/show.ejs", {listing});
}))

//Create Route
router.post("/", isLoggedIn, validateListing, wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    await newListing.save();
    req.flash("success", "New Listing Created!")
    res.redirect("/listings")
    console.log(newListing);
}));

//Edit Route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(async(req,res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing) {
        req.flash("error", "Listing you requested for does not exist");
        return res.redirect("/listings");
    }
    res.render("./listings/edit.ejs", {listing})
}))

//Update Route
router.put("/:id", isLoggedIn, isOwner, validateListing, wrapAsync(async (req, res) =>{
    let {id} = req.params;
    const listing = await Listing.findByIdAndUpdate(
        id,
        {...req.body.listing},
        {runValidators: true, new: true}
    );
    if(!listing) {
        req.flash("error", "Listing you requested for does not exist");
        return res.redirect("/listings");
    }
    req.flash("success", "Listing Updated!")
    res.redirect(`/listings/${id}`);
}))

//Delete Route
router.delete("/:id", isLoggedIn, isOwner, wrapAsync(async (req, res) =>{
    let { id } = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);
    if(!deletedListing) {
        req.flash("error", "Listing you requested for does not exist");
        return res.redirect("/listings");
    }
    req.flash("success", "Listing Deleted!")
    res.redirect("/listings")
}))

module.exports = router;
