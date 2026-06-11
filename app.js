require("dotenv").config({quiet: true});
const express = require("express");
const app = express();
const mongoose = require("mongoose")
const path = require("path");
const methodOverride = require("method-override")
const  ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js")
const session = require("express-session")
const flash = require("connect-flash")
const passport = require("passport")
const LocalStrategy = require("passport-local")
const {MongoStore} = require("connect-mongo");
const helmet = require("helmet");
const {rateLimit} = require("express-rate-limit");
const User = require("./models/user.js")

const listingRouter = require("./routes/listing.js")
const reviewRouter = require("./routes/review.js")
const userRouter = require("./routes/user.js")
const bookingRouter = require("./routes/booking.js")
const wishlistRouter = require("./routes/wishlist.js")
const adminRouter = require("./routes/admin.js")



const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";
const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
    if (!process.env.SESSION_SECRET) {
        throw new Error("SESSION_SECRET is required in production");
    }
}

mongoose.set("sanitizeFilter", true);

main().then(()=> {
    console.log("connect to DB");
})
.catch((err) =>{
    console.log(err);
})


async function main() {
    await mongoose.connect(MONGO_URL)
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}))
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"/public")));
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
}));

const sessionOptions = {
    secret: process.env.SESSION_SECRET || "wanderlust-development-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGO_URL,
        crypto: {secret: process.env.SESSION_SECRET || "wanderlust-development-secret"},
        touchAfter: 24 * 60 * 60,
    }),
    cookie: {
        expires: Date.now() + 7 * 24 * 60 *60 *1000,
        maxAge: 7 * 24 * 60 *60 *1000,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    },
}

app.get("/", (req,res) => {
    res.redirect("/listings")
})



app.use(session(sessionOptions));
app.use(flash())

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success")
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user;
    next();
})

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: "draft-7",
    legacyHeaders: false,
});

// app.get("/demouser", async(req, res) => {
//     let fakeUser = new User({
//         email: "student@gmail.com",
//         username: "Avit-student", 

//     });
//     let registeredUser = await User.register(fakeUser, "helloworld");
//     res.send(registeredUser);
// })


app.use("/listings",listingRouter)
app.use("/listings/:id/reviews", reviewRouter)
app.use("/", authLimiter, userRouter);
app.use("/bookings", bookingRouter);
app.use("/wishlist", wishlistRouter);
app.use("/admin", adminRouter);

app.get("/privacy", (req, res) => {
    res.render("legal.ejs", {title: "Privacy Policy"});
});

app.get("/terms", (req, res) => {
    res.render("legal.ejs", {title: "Terms of Service"});
});

// TEST ENDPOINT - Check Database Connection
app.get("/test-db", async (req, res) => {
    try {
        const Listing = require("./models/listing.js");
        const count = await Listing.countDocuments();
        res.send(`
            <h2>✅ Database Connection Working!</h2>
            <p>✅ Total Listings: <b>${count}</b></p>
            ${count === 0 ? '<p><a href="/seed">Load sample data →</a></p>' : '<p><a href="/listings">View listings →</a></p>'}
        `);
    } catch (error) {
        res.send(`<h2>❌ Database Error</h2><p>${error.message}</p>`);
    }
});

// SEED ENDPOINT - Load sample data
app.get("/seed", async (req, res) => {
    try {
        const { data: sampleListings } = require("./init/data.js");
        const Listing = require("./models/listing.js");
        const Review = require("./models/review.js");
        const Booking = require("./models/booking.js");
        const User = require("./models/user.js");

        console.log("🌱 Starting database seed...");
        
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
            console.log("👤 Created demo user");
        }

        // Add listings with owner
        const listingsWithOwner = sampleListings.map((listing) => ({
            ...listing,
            owner: demoUser._id,
        }));

        const savedListings = await Listing.insertMany(listingsWithOwner);
        console.log(`✅ Inserted ${savedListings.length} listings`);

        res.send(`
            <h2>✅ Database Seeded Successfully!</h2>
            <p>✅ Created demo user: <b>demo / demo1234</b></p>
            <p>✅ Added <b>${savedListings.length}</b> sample listings</p>
            <hr>
            <p><a href="/listings" style="color: #0066cc; text-decoration: underline;">View all listings →</a></p>
            <p><a href="/test-db" style="color: #0066cc; text-decoration: underline;">Check database status →</a></p>
        `);
    } catch (error) {
        console.error("❌ Seed Error:", error.message);
        res.send(`
            <h2>❌ Error During Seeding</h2>
            <p><b>Error:</b> ${error.message}</p>
            <p><a href="/test-db">Test database connection →</a></p>
        `);
    }
});

// app.get("/testListing", async(req, res) =>{
//     let sampleListing = new Listing({
//         title: "My New Villa",
//         description: "By the beach",
//         price: 1200,
//         location: "Calangute, Goa",
//         country: "India",
//     })
//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("Successful testing")
// })

app.all("*", (req, res, next)=>{
    next(new ExpressError(404, "Page not Found"));
});

app.use((err, req, res, next) =>{
    let {statusCode=500, message="Something went wrong!"} = err;
    res.status(statusCode).render("error.ejs", { message });
    // res.status(statusCode).send(message);
    // res.send("something went wrong")
});

app.listen(PORT,() =>{
    console.log(`Server is listening on port ${PORT}`);

})
