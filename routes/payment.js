const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const router = express.Router();
const exe = require("../conn");

require("dotenv").config();

// ======================================================
// RAZORPAY
// ======================================================

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ======================================================
// LOGIN CHECK
// ======================================================

function checkLogin(req, res, next) {

    if (req.session && req.session.user_id) {
        return next();
    }

    return res.status(401).json({
        success: false,
        message: "Please login first"
    });
}

// ======================================================
// TEST
// GET /payment
// ======================================================

router.get("/", (req, res) => {

    res.send("PAYMENT ROUTE WORKING");

});

// ======================================================
// CREATE RAZORPAY ORDER
//
// POST
// /payment/create-payment/:orderId
// ======================================================

router.post(
    "/create-payment/:orderId",
    checkLogin,
    async (req, res) => {

        try {

            const user_id = req.session.user_id;

            const orderId = Number(req.params.orderId);

            console.log("-----------------------------------");
            console.log("CREATE PAYMENT");
            console.log("User ID:", user_id);
            console.log("Database Order ID:", orderId);
            console.log("-----------------------------------");

            // ------------------------------------------
            // VALIDATE ORDER ID
            // ------------------------------------------

            if (!orderId) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid Order ID"
                });

            }

            // ------------------------------------------
            // CHECK RAZORPAY KEYS
            // ------------------------------------------

            if (
                !process.env.RAZORPAY_KEY_ID ||
                !process.env.RAZORPAY_KEY_SECRET
            ) {

                console.error("RAZORPAY KEYS NOT FOUND");

                return res.status(500).json({
                    success: false,
                    message: "Razorpay keys are missing in .env"
                });

            }

            // ------------------------------------------
            // GET ORDER
            // ------------------------------------------

            const orders = await exe(
                `
                SELECT *
                FROM orders
                WHERE order_id = ?
                AND user_id = ?
                LIMIT 1
                `,
                [orderId, user_id]
            );

            if (!orders || orders.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });

            }

            const order = orders[0];

            console.log("DATABASE ORDER:", order);

            // ------------------------------------------
            // AMOUNT
            // ------------------------------------------

            const totalAmount = Number(order.total_amount);

            if (
                isNaN(totalAmount) ||
                totalAmount <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid order amount"
                });

            }

            // ------------------------------------------
            // CONVERT RUPEES TO PAISE
            // ------------------------------------------

            const amountInPaise =
                Math.round(totalAmount * 100);

            console.log("Amount:", totalAmount);
            console.log("Amount in paise:", amountInPaise);

            // ------------------------------------------
            // CREATE RAZORPAY ORDER
            // ------------------------------------------

            const razorpayOrder =
                await razorpay.orders.create({

                    amount: amountInPaise,

                    currency: "INR",

                    receipt:
                        "order_" + orderId,

                    notes: {
                        database_order_id:
                            String(orderId),

                        user_id:
                            String(user_id)
                    }

                });

            console.log(
                "RAZORPAY ORDER CREATED:",
                razorpayOrder
            );

            // ------------------------------------------
            // SAVE RAZORPAY ORDER ID
            // ------------------------------------------

            await exe(
                `
                UPDATE orders
                SET
                    razorpay_order_id = ?,
                    payment_status = ?
                WHERE order_id = ?
                AND user_id = ?
                `,
                [
                    razorpayOrder.id,
                    "Pending",
                    orderId,
                    user_id
                ]
            );

            // ------------------------------------------
            // SEND RESPONSE
            // IMPORTANT:
            // These names MUST match frontend
            // ------------------------------------------

            return res.status(200).json({

                success: true,

                key:
                    process.env.RAZORPAY_KEY_ID,

                amount:
                    amountInPaise,

                currency:
                    "INR",

                razorpay_order_id:
                    razorpayOrder.id,

                database_order_id:
                    orderId,

                name:
                    (
                        (order.first_name || "") +
                        " " +
                        (order.last_name || "")
                    ).trim(),

                email:
                    order.email || "",

                phone:
                    order.phone || ""

            });

        }
        catch (error) {

            console.error(
                "CREATE RAZORPAY ORDER ERROR:"
            );

            console.error(error);

            let message =
                "Unable to create Razorpay order";

            if (
                error &&
                error.error &&
                error.error.description
            ) {

                message =
                    error.error.description;

            }
            else if (error.message) {

                message =
                    error.message;

            }

            return res.status(500).json({

                success: false,

                message: message

            });

        }

    }
);

// ======================================================
// VERIFY PAYMENT
//
// POST
// /payment/verify-payment/:orderId
// ======================================================

router.post(
    "/verify-payment/:orderId",
    checkLogin,
    async (req, res) => {

        try {

            const user_id =
                req.session.user_id;

            const databaseOrderId =
                Number(req.params.orderId);

            const {
                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature
            } = req.body;

            console.log("-----------------------------------");
            console.log("VERIFY PAYMENT");
            console.log(
                "Database Order:",
                databaseOrderId
            );
            console.log(
                "Razorpay Order:",
                razorpay_order_id
            );
            console.log(
                "Payment ID:",
                razorpay_payment_id
            );
            console.log("-----------------------------------");

            // ------------------------------------------
            // VALIDATION
            // ------------------------------------------

            if (!databaseOrderId) {

                return res.status(400).json({
                    success: false,
                    message: "Database order ID is missing"
                });

            }

            if (
                !razorpay_payment_id ||
                !razorpay_order_id ||
                !razorpay_signature
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment verification data is incomplete"

                });

            }

            // ------------------------------------------
            // GET ORDER
            // ------------------------------------------

            const orders = await exe(
                `
                SELECT *
                FROM orders
                WHERE order_id = ?
                AND user_id = ?
                LIMIT 1
                `,
                [
                    databaseOrderId,
                    user_id
                ]
            );

            if (!orders || orders.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Order not found"

                });

            }

            const order = orders[0];

            // ------------------------------------------
            // CHECK RAZORPAY ORDER ID
            // ------------------------------------------

            if (
                order.razorpay_order_id &&
                order.razorpay_order_id !==
                razorpay_order_id
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Razorpay order ID does not match"

                });

            }

            // ------------------------------------------
            // GENERATE SIGNATURE
            // ------------------------------------------

            const generatedSignature =
                crypto
                    .createHmac(
                        "sha256",
                        process.env.RAZORPAY_KEY_SECRET
                    )
                    .update(
                        razorpay_order_id +
                        "|" +
                        razorpay_payment_id
                    )
                    .digest("hex");

            console.log(
                "Generated Signature:",
                generatedSignature
            );

            console.log(
                "Razorpay Signature:",
                razorpay_signature
            );

            // ------------------------------------------
            // VERIFY SIGNATURE
            // ------------------------------------------

            if (
                generatedSignature !==
                razorpay_signature
            ) {

                await exe(
                    `
                    UPDATE orders
                    SET payment_status = ?
                    WHERE order_id = ?
                    AND user_id = ?
                    `,
                    [
                        "Failed",
                        databaseOrderId,
                        user_id
                    ]
                );

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid payment signature"

                });

            }

            // ------------------------------------------
            // PAYMENT SUCCESS
            // ------------------------------------------

            await exe(
                `
                UPDATE orders
                SET
                    payment = ?,
                    transaction_id = ?,
                    payment_status = ?,
                    razorpay_order_id = ?,
                    razorpay_payment_id = ?,
                    razorpay_signature = ?
                WHERE order_id = ?
                AND user_id = ?
                `,
                [
                    "Razorpay",
                    razorpay_payment_id,
                    "Paid",
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature,
                    databaseOrderId,
                    user_id
                ]
            );

            console.log(
                "PAYMENT SUCCESSFULLY SAVED"
            );

            // ------------------------------------------
            // RESPONSE
            // ------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "Payment verified successfully",

                order_id:
                    databaseOrderId,

                redirect:
                    "/order_success/" +
                    databaseOrderId

            });

        }
        catch (error) {

            console.error(
                "VERIFY PAYMENT ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Payment verification failed"

            });

        }

    }
);

// ======================================================
// PAYMENT FAILED
//
// POST
// /payment/payment-failed/:orderId
// ======================================================

router.post(
    "/payment-failed/:orderId",
    checkLogin,
    async (req, res) => {

        try {

            const user_id =
                req.session.user_id;

            const orderId =
                Number(req.params.orderId);

            if (!orderId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Order ID is required"

                });

            }

            await exe(
                `
                UPDATE orders
                SET payment_status = ?
                WHERE order_id = ?
                AND user_id = ?
                `,
                [
                    "Failed",
                    orderId,
                    user_id
                ]
            );

            return res.status(200).json({

                success: true,

                message:
                    "Payment marked as failed"

            });

        }
        catch (error) {

            console.error(
                "PAYMENT FAILED ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update payment status"

            });

        }

    }
);

module.exports = router;