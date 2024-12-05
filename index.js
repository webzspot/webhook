const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const { validatePaymentVerification } = require("razorpay/dist/utils/razorpay-utils");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

// Razorpay instance
const razorpay = new Razorpay({
    key_id: "rzp_test_qUePsQvwKUdYCu",
    key_secret: "zncIffQV4BBNSDBpfS2IKBy7",
});

// Route to create an order
app.post("/order", async (req, res) => {
    try {
        const { name, phoneNumber, amount } = req.body;

        const order = await razorpay.orders.create({
            amount: amount * 100, // Amount in paise
            currency: "INR",
        });

        // Store temporary order details
        await prisma.temporaryOrder.create({
            data: {
                order_id: order.id,
                name,
                phoneNumber,
                amount: (order.amount / 100).toString(),
            },
        });

        res.status(200).json({ order });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route to verify payment
app.post("/verify", async (req, res) => {
    try {
        const { razorpayPaymentId, razorpayOrderId, signature } = req.body;
        const secret = "zncIffQV4BBNSDBpfS2IKBy7";

        const isVerified = validatePaymentVerification(
            { order_id: razorpayOrderId, payment_id: razorpayPaymentId },
            signature,
            secret
        );

        if (isVerified) {
            const orderDetails = await prisma.temporaryOrder.findUnique({
                where: { order_id: razorpayOrderId },
            });

            if (!orderDetails) {
                return res.status(400).json({ error: "Temporary order not found" });
            }

            // Move to permanent order and clean up temporary order
            await prisma.permanentOrder.create({
                data: {
                    order_id: orderDetails.order_id,
                    payment_id: razorpayPaymentId,
                    name: orderDetails.name,
                    phoneNumber: orderDetails.phoneNumber,
                    amount: orderDetails.amount,
                },
            });

            await prisma.temporaryOrder.delete({
                where: { order_id: razorpayOrderId },
            });

            res.status(200).json({ message: "Payment Verified" });
        } else {
            res.status(400).json({ error: "Payment verification failed" });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Webhook to handle Razorpay payment events
app.post('/razorpay-webhook', (req, res) => {
    const webhookBody = req.body; // Raw webhook body
    const webhookSignature = req.headers['x-razorpay-signature']; // Signature sent in headers
    console.log(req.body)
    try {
        // Validate webhook signature
        const isValidSignature = validatePaymentVerification(webhookBody.toString(),webhookSignature,"zncIffQV4BBNSDBpfS2IKBy7");

        if (isValidSignature) {
            // Signature is valid; process the event
            const event = JSON.parse(webhookBody); // Parse the JSON payload
            console.log('Webhook Event:', event);

            // Handle specific events
            switch (event.event) {
                case 'payment.captured':
                    console.log('Payment captured:', event.payload.payment.entity);
                    // Update your database for successful payment
                    break;

                case 'payment.failed':
                    console.log('Payment failed:', event.payload.payment.entity);
                    // Handle failed payment
                    break;

                default:
                    console.log('Unhandled event:', event.event);
            }

            // Respond to Razorpay
            res.status(200).send('Webhook processed');
        } else {
            // Invalid signature
            console.error('Invalid webhook signature');
            res.status(400).send('Invalid signature');
        }
    } catch (error) {
        console.error('Error processing webhook:', error.message);
        res.status(500).send('Internal server error');
    }
});

// Start the server
app.listen(8001, () => {
    console.log("Server started on port 8001");
});
