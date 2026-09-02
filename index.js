// // index.js
// const express = require('express');
// const bodyParser = require('body-parser');
// const fileUpload = require('express-fileupload');
// const session = require('express-session');
// const path = require('path');

// const adminRouter = require('./routes/admin');
// const userRouter = require('./routes/user');

// const app = express();

// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// // middlewares
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(fileUpload());

// app.use(session({ secret: 'acbsc31243',
//      resave: true,
//       saveUninitialized: true }));


// // static files -> NOTE: use '/uploads' in EJS (consistent)
// app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
// app.use(express.static(path.join(__dirname, 'public')));

// // mount routers
// app.use('/admin', adminRouter);
// app.use('/', userRouter);


// app.get("/admin", async (req, res) => {
//     try {
//         let sql = "SELECT COUNT(*) AS total FROM products";
//         const result = await exe(sql);
//         const totalProducts = result[0].total;
//         res.render("admin/index", { totalProducts });
//     } catch (err) {
//         console.error(err);
//         res.send("Database error");
//     }
// });

// // start
// app.listen(1000, () => {
//   console.log('Server started: http://localhost:1000');
// });

const express = require("express");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const adminRouter = require("./routes/admin");
const userRouter = require("./routes/user");
const paymentRouter = require("./routes/payment");

const app = express();


// ======================================================
// VIEW ENGINE
// ======================================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());

app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

app.use(fileUpload());

app.use(
    session({
        secret: process.env.SESSION_SECRET || "acbsc31243",
        resave: false,
        saveUninitialized: false
    })
);


// ======================================================
// STATIC FILES
// ======================================================

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "public", "uploads")
    )
);

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ======================================================
// ROUTES
// ======================================================

app.use("/admin", adminRouter);

app.use("/payment", paymentRouter);

app.use("/", userRouter);


// ======================================================
// HOME TEST
// ======================================================

app.get("/", (req, res) => {
    res.send("E-commerce website working");
});


// ======================================================
// PAYMENT ROUTE TEST
// ======================================================

app.get("/payment-test", (req, res) => {
    res.send("Payment system working");
});


// ======================================================
// 404
// ======================================================

app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <p>Requested URL: ${req.method} ${req.originalUrl}</p>
    `);
});


// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {

    console.error("SERVER ERROR:", err);

    res.status(500).send(
        "Internal Server Error"
    );

});


// ======================================================
// SERVER
// ======================================================

const PORT = process.env.PORT || 1000;

app.listen(PORT, () => {

    console.log(
        "======================================"
    );

    console.log(
        "Server started successfully"
    );

    console.log(
        `Server running on port ${PORT}`
    );

    console.log(
        "======================================"
    );

});