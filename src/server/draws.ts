import "server-only";

// STUB: no database writes or winners. A3 will add admin authorization and the draw.
export async function createDraw(weekStart: Date, commitHash: string, prizes: { label: string }[]): Promise<void> {
  void weekStart;
  void commitHash;
  void prizes;
}

export async function runDraw(weekStart: Date, seed: string): Promise<{ userId: string; displayName: string; prize: string }[]> {
  void weekStart;
  void seed;
  return [];
}
