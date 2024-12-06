const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const { validatePaymentVerification } = require("razorpay/dist/utils/razorpay-utils");
const { PrismaClient } = require("@prisma/client");
const crypto = require('crypto');
const app = express();
const prisma = new PrismaClient();


app.use(cors());

app.use(express.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf.toString(); // Store raw body as a string
    }
}));


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
// app.post("/verify", async (req, res) => {
//     try {
//         const { razorpayPaymentId, razorpayOrderId, signature } = req.body;
//         const secret = "zncIffQV4BBNSDBpfS2IKBy7";

//         const isVerified = validatePaymentVerification(
//             { order_id: razorpayOrderId, payment_id: razorpayPaymentId },
//             signature,
//             secret
//         );

//         if (isVerified) {
//             const orderDetails = await prisma.temporaryOrder.findUnique({
//                 where: { order_id: razorpayOrderId },
//             });

//             if (!orderDetails) {
//                 return res.status(400).json({ error: "Temporary order not found" });
//             }

//             // Move to permanent order and clean up temporary order
//             await prisma.permanentOrder.create({
//                 data: {
//                     order_id: orderDetails.order_id,
//                     payment_id: razorpayPaymentId,
//                     name: orderDetails.name,
//                     phoneNumber: orderDetails.phoneNumber,
//                     amount: orderDetails.amount,
//                 },
//             });

//             await prisma.temporaryOrder.delete({
//                 where: { order_id: razorpayOrderId },
//             });

//             res.status(200).json({ message: "Payment Verified" });
//         } else {
//             res.status(400).json({ error: "Payment verification failed" });
//         }
//     } catch (error) {
//         console.error("Error verifying payment:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

// Webhook to handle Razorpay payment events


// Webhook to handle Razorpay payment events
app.post('/razorpay-webhook', async (req, res) => {
    const webhookBody = req.rawBody; // Use rawBody middleware to capture raw body
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = "zncIffQV4BBNSDBpfS2IKBy7";

    if (!webhookBody) {
        console.error('Webhook body is empty or undefined');
        return res.status(400).send('Invalid request body');
    }

    try {
        // Validate webhook signature using crypto
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(webhookBody) // Ensure webhookBody is a string or Buffer
            .digest('hex');

        if (expectedSignature === webhookSignature) {
            const event = JSON.parse(webhookBody);
            
            switch (event.event) {
                case 'payment.captured':
                    const paymentDetails = event.payload.payment.entity;
                    const orderId = paymentDetails.order_id;
                    const paymentId = paymentDetails.id;

                    const orderDetails = await prisma.temporaryOrder.findUnique({
                        where: { order_id: orderId },
                    });

                    if (!orderDetails) {
                        return res.status(404).json({ error: "Temporary order not found" });
                    }

                    await prisma.permanentOrder.create({
                        data: {
                            order_id: orderId,
                            payment_id: paymentId,
                            name: orderDetails.name,
                            phoneNumber: orderDetails.phoneNumber,
                            amount: orderDetails.amount,
                        },
                    });

                    await prisma.temporaryOrder.delete({
                        where: { order_id: orderId },
                    });

                    return res.status(200).json({ message: "Payment Verified" });

                case 'payment.failed':
                    console.log('Payment failed:', event.payload.payment.entity);
                    return res.status(200).send('Payment failed event logged');

                default:
                    console.log('Unhandled event:', event.event);
                    return res.status(200).send('Unhandled event');
            }
        } else {
            return res.status(400).send('Invalid webhook signature');
        }
    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(500).send('Internal server error');
    }
});

// Start the server
app.listen(8001, () => {
    console.log("Server started on port 8001");
});
