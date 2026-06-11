const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose")


const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    wishlist: [{
        type: Schema.Types.ObjectId,
        ref: "Listing",
    }],
})

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
