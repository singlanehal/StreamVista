import { db } from "@/lib/db";
import { WebhookReceiver } from "livekit-server-sdk";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const receiver = new WebhookReceiver(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
);

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const headerPayload = headers();
        const authorization = headerPayload.get('Authorization');
        
        if (!authorization) {
            return new Response("No authorization header", { status: 400 });
        } 
        
        const event = await receiver.receive(body, authorization); 
        
        if (!event || !event.event) {
            return new Response("Invalid webhook event", { status: 400 });
        }
        
        if (event.event === "ingress_started" || event.event === "ingress_ended") {
            const isLive = event.event === "ingress_started";
            await db.stream.update({
                where: {
                    ingressId: event.ingressInfo?.ingressId,
                },
                data: {
                    isLive: isLive,
                },
            });
        } else {
            // Handle unknown event types
            return new Response("Unknown webhook event type", { status: 400 });
        }
        
        return new Response("OK");
    } catch (error) {
        console.error("LIVEKIT_WEBHOOK_ERROR", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
