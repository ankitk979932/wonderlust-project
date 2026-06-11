const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true,
    },
    guest: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    checkIn: {
        type: Date,
        required: true,
    },
    checkOut: {
        type: Date,
        required: true,
    },
    guests: {
        type: Number,
        min: 1,
        max: 10,
        required: true,
    },
    totalPrice: {
        type: Number,
        min: 0,
        required: true,
    },
    paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
},
razorpayOrderId: String,
razorpayPaymentId: String,
razorpaySignature: String,
}, {timestamps: true});


module.exports = mongoose.model("Booking", bookingSchema);

