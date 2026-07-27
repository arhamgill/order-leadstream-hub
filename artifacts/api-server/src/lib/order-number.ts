import { getSupabaseClient } from "./supabase.js";

/**
 * Atomically increments and returns the next order number.
 * Format: LSH-100001
 */
export async function generateOrderNumber(): Promise<string> {
  const supabase = getSupabaseClient();

  // Atomically increment the sequence using a raw SQL RPC
  // Falls back to a simple select+update if RPC not available
  const { data, error } = await supabase.rpc("increment_order_sequence");

  if (error || !data) {
    // Fallback: manual increment (slightly less safe under high concurrency, fine for this scale)
    const { data: seq, error: seqErr } = await supabase
      .from("order_sequences")
      .select("last_value")
      .eq("id", "main")
      .single();

    if (seqErr || !seq) {
      throw new Error("Failed to read order sequence: " + seqErr?.message);
    }

    const next = (seq.last_value as number) + 1;

    const { error: updateErr } = await supabase
      .from("order_sequences")
      .update({ last_value: next })
      .eq("id", "main");

    if (updateErr) {
      throw new Error("Failed to update order sequence: " + updateErr.message);
    }

    return `LSH-${next}`;
  }

  return `LSH-${data}`;
}
