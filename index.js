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
