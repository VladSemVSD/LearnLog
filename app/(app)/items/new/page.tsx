import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "New item · Learning Portal" };

export default function NewItemPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New item</h1>
      <p className="text-muted-foreground text-sm">
        The full create form lands in Phase 2.
      </p>
      <div>
        <Button variant="outline" nativeButton={false} render={<Link href="/items" />}>
          Back to items
        </Button>
      </div>
    </div>
  );
}
