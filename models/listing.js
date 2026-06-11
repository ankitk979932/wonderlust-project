const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review");
const Booking = require("./booking");

const listingSchema = new Schema({
    title: {
        type:String,
        required:true,
    },
    description: String,
    image: {
        type:String,
        default: "https://images.unsplash.com/photo-1682687982134-2ac563b2228b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",

        set: (v) => 
        v === "" ? 
        "https://images.unsplash.com/photo-1682687982134-2ac563b2228b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" : v,
    },
    price: Number,
    location: String,
    country: String, 
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
});

listingSchema.post("findOneAndDelete", async (listing) => {
    if (listing) {
        await Review.deleteMany({_id: {$in: listing.reviews}})
        await Booking.deleteMany({listing: listing._id});
    }
    
})

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
