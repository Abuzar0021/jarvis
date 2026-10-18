import { studioResponse } from "@/lib/studio-response";

export const dynamic = "force-static";

export function GET() {
  return studioResponse("work");
}
