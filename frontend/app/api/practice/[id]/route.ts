import { authenticatedBackendFetch } from "@/lib/backend-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await authenticatedBackendFetch(`/api/kits/${encodeURIComponent(id)}/practice`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(await request.json()),
  });
  return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json" } });
}