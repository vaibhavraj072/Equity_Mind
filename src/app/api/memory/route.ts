import { NextRequest, NextResponse } from "next/server";
import { getUserProfile, updateUserProfile } from "@/lib/memory/user-profile";

export async function GET() {
    const profile = getUserProfile();
    return NextResponse.json(profile);
}

export async function POST(req: NextRequest) {
    try {
        const patch = await req.json();
        const updated = updateUserProfile(patch);
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
