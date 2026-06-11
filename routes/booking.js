const express = require("express");
const router = express.Router({mergeParams: true});
const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const ExpressError = require("../utils/ExpressError.js");
const wrapAsync = require("../utils/wrapAsync.js");
const {isLoggedIn} = require("../middleware.js");
const Razorpay = require("razorpay");
const crypto = require("crypto");

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

router.get("/", isLoggedIn, wrapAsync(async (req, res) => {
    const bookings = await Booking.find({guest: req.user._id})
        .populate("listing")
        .sort({checkIn: 1});
    res.render("bookings/index.ejs", {bookings});
}));

router.post("/listings/:id", isLoggedIn, wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, "Listing does not exist");
    }

    let checkIn = new Date(req.body.checkIn);
    let checkOut = new Date(req.body.checkOut);
    const guests = Number(req.body.guests);
    
    // Ensure dates are valid
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!Number.isInteger(nights) || nights < 1 || checkIn < today || !Number.isInteger(guests) || guests < 1 || guests > 10) {
        throw new ExpressError(400, "Choose valid dates and number of guests");
    }

    const conflictBookings = await Booking.find({
        listing: listing._id,
    });
    
    let hasConflict = false;
    for (let b of conflictBookings) {
        if (checkIn < b.checkOut && checkOut > b.checkIn) {
            hasConflict = true;
            break;
        }
    }
    
    if (hasConflict) {
        req.flash("error", "This stay is already booked for those dates");
        return res.redirect(`/listings/${listing._id}`);
    }

    const booking = new Booking({
        listing: listing._id,
        guest: req.user._id,
        checkIn,
        checkOut,
        guests,
        totalPrice: nights * listing.price,
    });
    await booking.save();
    
    // Payment page show karo
    res.render("bookings/payment.ejs", {
        bookingId: booking._id,
        totalPrice: booking.totalPrice,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        listingTitle: listing.title,
        guestName: req.user.username,
        guestEmail: req.user.email,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
    });
}));

router.delete("/:bookingId", isLoggedIn, wrapAsync(async (req, res) => {
    const booking = await Booking.findOneAndDelete({
        _id: req.params.bookingId,
        guest: req.user._id,
    });
    if (!booking) {
        throw new ExpressError(404, "Booking does not exist");
    }
    req.flash("success", "Booking cancelled");
    res.redirect("/bookings");
}));

// Create Razorpay Order
router.post("/:id/create-order", isLoggedIn, wrapAsync(async (req, res) => {
    // Payment disabled in test mode
    if (!process.env.RAZORPAY_KEY_ID) {
        return res.json({
            success: false,
            message: "Payment gateway not configured. Contact admin."
        });
    }
    
    if (!razorpay) {
        throw new ExpressError(500, "Payment gateway not configured");
    }
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
        throw new ExpressError(404, "Booking not found");
    }

    const options = {
        amount: booking.totalPrice * 100, // Paise mein
        currency: "INR",
        receipt: `receipt_${booking._id}`,
        notes: {
            bookingId: booking._id,
            guestId: req.user._id,
        },
    };

    try {
        const order = await razorpay.orders.create(options);
        booking.razorpayOrderId = order.id;
        await booking.save();
        
        res.json(order);
    } catch (error) {
        throw new ExpressError(500, "Payment order creation failed");
    }
}));

// Verify Payment
router.post("/:id/verify-payment", isLoggedIn, wrapAsync(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    
    // Signature verify karo
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

    if (expectedSignature === razorpay_signature) {
        booking.paymentStatus = "completed";
        booking.razorpayPaymentId = razorpay_payment_id;
        booking.razorpaySignature = razorpay_signature;
        await booking.save();

        req.flash("success", "Payment successful! Your booking is confirmed.");
        res.redirect(`/bookings`);
    } else {
        booking.paymentStatus = "failed";
        await booking.save();
        throw new ExpressError(400, "Payment verification failed");
    }
}));

module.exports = router;
