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
