import { NextResponse } from "next/server";
import { getHistory } from "@/lib/memory/history";

export async function GET() {
    const history = getHistory(20);
    return NextResponse.json(history);
}
