import "dotenv/config";

async function testE2E() {
    console.log("Starting e2e testing...");
    const baseUrl = "http://localhost:4000";

    try {
        console.log("Check API Health");
        const healthRes = await fetch(`${baseUrl}/health`);
        const health = await healthRes.json();
        console.log("Health:", health);

        console.log("\\n--- Testing Campaign Dispatch ---");
        // Get dashboards to find a draft campaign
        const dashRes = await fetch(`${baseUrl}/v1/dashboard`);
        const dash = await dashRes.json();

        const draftCampaign = dash.campaigns.find((c: any) => c.stage === "draft");
        if (draftCampaign) {
            console.log("Found draft campaign:", draftCampaign.id);
            // Approve and dispatch campaign
            const dispatchRes = await fetch(`${baseUrl}/v1/campaigns/${draftCampaign.id}/dispatch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ approvedBy: "test-user" })
            });
            const dispatchData = await dispatchRes.json();
            console.log("Campaign Dispatch Response:", dispatchData);

            if (dispatchData.activity && dispatchData.activity.providerMessageId) {
                console.log("\\n--- Testing Resend Webhook ---");
                // Test the resend webhook with this message ID
                // Note: since this is a test we won't have the real signature, but we'll try to hit it
                // To bypass signature verify, we might need a test mode or we can just see if it handles it properly.
                // The webhook endpoint expects a specific payload format.
                const webhookRes = await fetch(`${baseUrl}/v1/webhooks/resend`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "email.delivered",
                        data: {
                            email_id: dispatchData.activity.providerMessageId
                        }
                    })
                });
                const webhookData = await webhookRes.json();
                console.log("Resend Webhook Response:", webhookData);

                // Fetch the activity again to see if status changed
                const activityRes = await fetch(`${baseUrl}/v1/campaigns/${draftCampaign.id}/activity`);
                const activities = await activityRes.json();
                console.log("Updated Campaign Activities:", activities);
            } else {
                console.log("No valid external ID returned for campaign activity, skipping webhook test.");
            }
        } else {
            console.log("No draft campaign found.");
        }

        console.log("\\n--- Testing Call Dispatch ---");
        const newLeadRes = await fetch(`${baseUrl}/v1/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: "E2E Test Lead",
                source: "api-test",
                score: 95
            })
        });
        const newLead = await newLeadRes.json();
        console.log("Created test lead:", newLead.id);

        const callDispatchRes = await fetch(`${baseUrl}/v1/calls/dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                leadId: newLead.id,
                provider: "twilio"
            })
        });
        const callDispatchData = await callDispatchRes.json();
        console.log("Call Dispatch Response:", callDispatchData);

        if (callDispatchData.call && callDispatchData.call.providerCallId) {
            console.log("\\n--- Testing Twilio Webhook ---");
            const twilioBody = new URLSearchParams();
            twilioBody.append("CallSid", callDispatchData.call.providerCallId);
            twilioBody.append("CallStatus", "completed");

            const twilioWebhookRes = await fetch(`${baseUrl}/v1/webhooks/twilio/voice-status`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: twilioBody.toString()
            });
            const twilioWebhookData = await twilioWebhookRes.json();
            console.log("Twilio Webhook Response:", twilioWebhookData);

            // Fetch call to check status
            const callCheckRes = await fetch(`${baseUrl}/v1/calls/${callDispatchData.call.id}`);
            const callCheckData = await callCheckRes.json();
            console.log("Updated Call Record:", callCheckData);
        } else {
            console.log("No valid providerCallId returned for call, skipping twilio webhook test.");
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

testE2E();
