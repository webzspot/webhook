const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const { validatePaymentVerification } = require("razorpay/dist/utils/razorpay-utils");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const app = express();
const prisma = new PrismaClient();

// Middleware to handle JSON and capture raw body for webhook verification
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString(); // Capture raw body for webhook signature validation
    }
}));

// Razorpay instance
const razorpay = new Razorpay({
    key_id: "rzp_test_qUePsQvwKUdYCu", // Replace with your Razorpay test key
    key_secret: "zncIffQV4BBNSDBpfS2IKBy7", // Replace with your Razorpay secret key
});

// Route to create an order
app.post("/order-ecom", async (req, res) => {
    try {
        const { name, phoneNumber, amount } = req.body;

        const order = await razorpay.orders.create({
            amount: amount * 100, // Amount in paise (multiply by 100)
            currency: "INR",
        });

        // Store temporary order details in database
        await prisma.temporaryOrder.create({
            data: {
                order_id: order.id,
                name,
                phoneNumber,
                amount: (order.amount / 100).toString(), // Store amount in rupees
            },
        });

        res.status(200).json({ order });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
app.post("/order-session", async (req, res) => {
    try {
        const { name, phoneNumber, amount } = req.body;

        const order = await razorpay.orders.create({
            amount: amount * 100, // Amount in paise (multiply by 100)
            currency: "INR",
        });

        // Store temporary order details in database
        await prisma.temporaryOrderSession.create({
            data: {
                order_id: order.id,
                name,
                phoneNumber,
                amount: (order.amount / 100).toString(), // Store amount in rupees
            },
        });

        res.status(200).json({ order });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Webhook route to handle Razorpay payment events
app.post("/razorpay-webhook", async (req, res) => {
    const webhookSecret = "zncIffQV4BBNSDBpfS2IKBy7"; // Razorpay webhook secret
    const webhookBody = req.rawBody;
    const webhookSignature = req.headers["x-razorpay-signature"];

    if (!webhookBody || !webhookSignature) {
        return res.status(400).send("Webhook body or signature missing");
    }

    try {
        // Validate webhook signature using HMAC
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(webhookBody)
            .digest("hex");

        if (expectedSignature !== webhookSignature) {
            return res.status(400).send("Invalid webhook signature");
        }

        const event = JSON.parse(webhookBody);

        console.log("Webhook event received:", event); // Log the received event

        // Handle specific Razorpay events
        switch (event.event) {
            case "payment.captured":
                const paymentDetails = event.payload.payment.entity;
                const orderId = paymentDetails.order_id;
                const paymentId = paymentDetails.id;

                // Find temporary order and session details
                const orderDetails = await prisma.temporaryOrder.findUnique({
                    where: { order_id: orderId },
                });
                const orderDetailsSession = await prisma.temporaryOrderSession.findUnique({
                    where: { order_id: orderId },
                });

                if (!orderDetails && !orderDetailsSession) {
                    console.error("No matching temporary order or session found for order_id:", orderId);
                    return res.status(404).json({ error: "Temporary order or session not found" });
                }

                // Use transaction to ensure atomic operations
                await prisma.$transaction(async (tx) => {
                    // If temporary order exists, move it to permanentOrder
                    if (orderDetails) {
                        await tx.permanentOrder.create({
                            data: {
                                order_id: orderId,
                                payment_id: paymentId,
                                name: orderDetails.name,
                                phoneNumber: orderDetails.phoneNumber,
                                amount: orderDetails.amount,
                            },
                        });

                        await tx.temporaryOrder.delete({
                            where: { order_id: orderId },
                        });
                    }

                    // If temporary order session exists, move it to permanentOrderSession
                    if (orderDetailsSession) {
                        await tx.permanentOrderSession.create({
                            data: {
                                order_id: orderId,
                                payment_id: paymentId,
                                name: orderDetailsSession.name,
                                phoneNumber: orderDetailsSession.phoneNumber,
                                amount: orderDetailsSession.amount,
                            },
                        });

                        await tx.temporaryOrderSession.delete({
                            where: { order_id: orderId },
                        });
                    }
                });

                return res.status(200).json({ message: "Payment Verified" });

            case "payment.failed":
                console.log("Payment failed:", event.payload.payment.entity);
                return res.status(200).send("Payment failed event logged");

            default:
                console.log("Unhandled event:", event.event);
                return res.status(200).send("Unhandled event");
        }
    } catch (error) {
        console.error("Webhook processing error:", error.stack || error);
        res.status(500).send("Internal server error");
    }
});


// Start the server
app.listen(8001, () => {
    console.log("Server started on port 8001");
});
