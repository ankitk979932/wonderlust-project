# Wanderlust

Airbnb-style accommodation platform built with Express, MongoDB, EJS, and Passport.

## Local setup

1. Start MongoDB.
2. Copy `.env.example` to `.env` and set a strong `SESSION_SECRET`.
3. Install dependencies with `npm install`.
4. Load demo listings with `npm run seed`.
5. Start the app with `npm start`.
6. Open `http://localhost:8080`.

Demo admin account:

- Username: `demo`
- Password: `demo1234`

## Included features

- Listing search, hosting, editing, and deletion
- Photo-first responsive interface
- Signup, login, logout, ownership, and admin authorization
- Reviews with author moderation
- Reservations, trip management, cancellation, and date-conflict prevention
- Wishlists
- Admin dashboard
- MongoDB-backed sessions, rate limiting, and security headers

## External integrations still requiring credentials

Set the corresponding values in `.env` before implementing or enabling:

- Cloudinary: image uploads and transformations
- Mapbox: maps and geocoding
- Razorpay or Stripe: real payment processing and webhooks
- SMTP provider: email verification and password-reset emails
- MongoDB Atlas: deployed production database
- Hosting provider: Render, Railway, or another Node.js host

Never commit `.env` or production credentials.
