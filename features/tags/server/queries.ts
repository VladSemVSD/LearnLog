import "server-only";

import { requireUser } from "@/features/auth/server";
import { listTags } from "../service";

export async function listTagsForUser() {
  const user = await requireUser();
  return listTags(user.id);
}
