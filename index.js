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
    verify: (req, _res, buf) => {
        req.rawBody = buf.toString(); // Capture raw body for webhook signature validation
    }
}));

// Razorpay instance
const razorpay = new Razorpay({
    key_id: "rzp_test_qUePsQvwKUdYCu", // Replace with your Razorpay test key
    key_secret: "zncIffQV4BBNSDBpfS2IKBy7", // Replace with your Razorpay secret key
});

// Route to create an order
app.post("/order", async (req, res) => {
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
app.post("/session", async (req, res) => {
    try {
        const { name, phoneNumber, amount, email } = req.body;

        const order = await razorpay.orders.create({
            amount: amount * 100, // Amount in paise (multiply by 100)
            currency: "INR",
        });

        // Store temporary order details in database
        await prisma.sessionTempOrder.create({
            data: {
                order_id: order.id,
                name,
                phoneNumber,
                email,
                amount: (order.amount / 100).toString(), // Store amount in rupees
            },
        });

        res.status(200).json({ order });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/razorpay-webhook", async (req, res) => {
    const webhookSecret = "zncIffQV4BBNSDBpfS2IKBy7";  // Load from environment variables
    const webhookBody = req.rawBody;
    const webhookSignature = req.headers["x-razorpay-signature"];

    if (!webhookBody || !webhookSignature) {
        return res.status(400).send("Webhook body or signature missing");
    }

    try {
        // Validate webhook signature using HMAC (SHA256)
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(webhookBody)
            .digest("hex");

        if (expectedSignature === webhookSignature) {
            const event = JSON.parse(webhookBody);

            switch (event.event) {
                case "payment.captured":
                    const paymentDetails = event.payload.payment.entity;
                    const orderId = paymentDetails.order_id;
                    const paymentId = paymentDetails.id;

                    // Log the received payment info for debugging
                    console.log("Received payment details:", { orderId, paymentId });

                    // Fetch session and temporary order details using the orderId
                    const sessionOrder = await prisma.sessionTempOrder.findUnique({
                        where: { order_id: orderId },
                    });
                    const orderDetails = await prisma.temporaryOrder.findUnique({
                        where: { order_id: orderId },
                    });

                    if (!orderDetails && !sessionOrder) {
                        console.error("Order not found in both session and temporary orders.");
                        return res.status(404).json({ error: "Order not found" });
                    }

                    if (orderDetails) {
                        // Process temporary order
                        await prisma.permanentOrder.create({
                            data: {
                                order_id: orderId,
                                payment_id: paymentId,
                                name: orderDetails.name,
                                phoneNumber: orderDetails.phoneNumber,
                                amount: orderDetails.amount,
                            },
                        });

                        // Remove the temporary order after successful payment
                        await prisma.temporaryOrder.delete({
                            where: { order_id: orderId },
                        });

                        return res.status(200).json({ message: "Payment Verified" });
                    }

                    if (sessionOrder) {
                        // Process session order
                        await prisma.sessionPermanentOrder.create({
                            data: {
                                order_id: orderId,
                                payment_id: paymentId,
                                name: sessionOrder.name,
                                phoneNumber: sessionOrder.phoneNumber,
                                amount: sessionOrder.amount,
                                email: sessionOrder.email,
                            },
                        });

                        // Remove the session temporary order after payment
                        await prisma.sessionTempOrder.delete({
                            where: { order_id: orderId },
                        });

                        return res.status(200).json({ message: "Payment Verified" });
                    }
                    break;

                case "payment.failed":
                    console.log("Payment failed:", event.payload.payment.entity);
                    return res.status(200).send("Payment failed event logged");

                default:
                    console.log("Unhandled event:", event.event);
                    return res.status(200).send("Unhandled event");
            }
        } else {
            console.error("Invalid webhook signature:", { expectedSignature, webhookSignature });
            return res.status(400).send("Invalid webhook signature");
        }
    } catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).send("Internal server error");
    }
});


// Start the server
app.listen(8001, () => {
    console.log("Server started on port 8001");
});
