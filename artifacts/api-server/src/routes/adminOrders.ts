import { Router, type Request, type Response, type NextFunction } from "express";
import { getSupabaseClient } from "../lib/supabase.js";
import { getStripeClient } from "../lib/stripe.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { logger } from "../lib/logger.js";

const adminOrdersRouter = Router();
adminOrdersRouter.use(requireAdmin);

// ─── List Orders ──────────────────────────────────────────────
adminOrdersRouter.get("/admin/orders", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { page = "1", limit = "25", search, status, payment_method, date_from, date_to } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from("orders")
      .select(`
        id, order_number, status, payment_method, subtotal_cents, fee_cents, discount_cents, total_cents, created_at,
        customers!inner(id, first_name, last_name, agency_name, email, phone),
        payments(id, status, method, amount_cents),
        order_items(id)
      `, { count: "exact" });

    if (status) query = query.eq("status", status);
    if (payment_method) query = query.eq("payment_method", payment_method);
    if (date_from) query = query.gte("created_at", date_from);
    if (date_to) query = query.lte("created_at", date_to);
    if (search) {
      // Search by order number or customer name/email
      query = query.or(`order_number.ilike.%${search}%,customers.first_name.ilike.%${search}%,customers.last_name.ilike.%${search}%,customers.email.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    type CustomerRow = { first_name: string; last_name: string; agency_name: string | null; email: string };
    type PaymentRow = { status: string };

    const orders = (data ?? []).map((o: Record<string, unknown>) => {
      const cust = (Array.isArray(o.customers) ? o.customers[0] : o.customers) as CustomerRow;
      const payments = (o.payments as PaymentRow[] | null) ?? [];
      return {
        id: o.id,
        order_number: o.order_number,
        customer_name: `${cust?.first_name ?? ""} ${cust?.last_name ?? ""}`.trim(),
        customer_email: cust?.email ?? "",
        agency_name: cust?.agency_name ?? null,
        status: o.status,
        payment_method: o.payment_method,
        payment_status: payments[0]?.status ?? "unknown",
        total_cents: o.total_cents,
        subtotal_cents: o.subtotal_cents,
        fee_cents: o.fee_cents,
        discount_cents: o.discount_cents,
        item_count: Array.isArray(o.order_items) ? o.order_items.length : 0,
        created_at: o.created_at,
      };
    });

    res.json({ orders, total: count ?? 0, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// ─── Order Detail ─────────────────────────────────────────────
adminOrdersRouter.get("/admin/orders/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    const [orderRes, notesRes, historyRes] = await Promise.all([
      supabase
        .from("orders")
        .select(`
          id, order_number, status, payment_method, subtotal_cents, fee_cents, discount_cents, total_cents,
          additional_instructions, default_settings, created_at,
          customers(id, first_name, last_name, agency_name, email, phone, created_at),
          order_items(id, category, type, quantity, price_cents, savings_cents),
          product_answers(id, product_key, overridden, answers),
          payments(id, method, status, amount_cents, stripe_payment_intent_id, stripe_status, zelle_screenshot_url, created_at)
        `)
        .eq("id", id)
        .single(),
      supabase.from("admin_notes").select("*").eq("order_id", id).order("created_at"),
      supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at"),
    ]);

    if (orderRes.error || !orderRes.data) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const o = orderRes.data as Record<string, unknown>;
    const cust = Array.isArray(o.customers) ? o.customers[0] : o.customers;
    const pmts = (o.payments as unknown[]) ?? [];

    res.json({
      id: o.id, order_number: o.order_number, status: o.status, payment_method: o.payment_method,
      subtotal_cents: o.subtotal_cents, fee_cents: o.fee_cents, discount_cents: o.discount_cents,
      total_cents: o.total_cents, additional_instructions: o.additional_instructions ?? null,
      default_settings: o.default_settings ?? {}, created_at: o.created_at,
      customer: cust,
      items: o.order_items ?? [],
      product_answers: o.product_answers ?? [],
      payment: pmts[0] ?? null,
      notes: notesRes.data ?? [],
      status_history: historyRes.data ?? [],
    });
  } catch (err) {
    next(err);
  }
});

// ─── Update Status ─────────────────────────────────────────────
adminOrdersRouter.patch("/admin/orders/:id/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const { status, note } = req.body as { status: string; note?: string };

    const allowed = ["pending", "paid", "processing", "completed", "refunded"];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const { data: current } = await supabase.from("orders").select("status").eq("id", id).single();
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) throw error;

    await supabase.from("order_status_history").insert({
      order_id: id, from_status: current?.status ?? null, to_status: status, note: note ?? null,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── Approve Payment ───────────────────────────────────────────
adminOrdersRouter.post("/admin/orders/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    const { data: current } = await supabase.from("orders").select("status").eq("id", id).single();
    await supabase.from("payments").update({ status: "succeeded" }).eq("order_id", id);
    const { error } = await supabase.from("orders").update({ status: "paid" }).eq("id", id);
    if (error) throw error;

    await supabase.from("order_status_history").insert({
      order_id: id, from_status: current?.status ?? null, to_status: "paid", note: "Payment approved by admin",
    });

    res.json({ success: true, message: "Payment approved" });
  } catch (err) {
    next(err);
  }
});

// ─── Reject Payment ────────────────────────────────────────────
adminOrdersRouter.post("/admin/orders/:id/reject", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    const { data: current } = await supabase.from("orders").select("status").eq("id", id).single();
    await supabase.from("payments").update({ status: "failed" }).eq("order_id", id);
    const { error } = await supabase.from("orders").update({ status: "pending" }).eq("id", id);
    if (error) throw error;

    await supabase.from("order_status_history").insert({
      order_id: id, from_status: current?.status ?? null, to_status: "pending",
      note: reason ? `Payment rejected: ${reason}` : "Payment rejected by admin",
    });

    res.json({ success: true, message: "Payment rejected" });
  } catch (err) {
    next(err);
  }
});

// ─── Refund Order ──────────────────────────────────────────────
adminOrdersRouter.post("/admin/orders/:id/refund", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    const { data: payment } = await supabase
      .from("payments")
      .select("stripe_payment_intent_id, amount_cents")
      .eq("order_id", id)
      .single();

    if (payment?.stripe_payment_intent_id) {
      const stripe = getStripeClient();
      await stripe.refunds.create({ payment_intent: payment.stripe_payment_intent_id });
    }

    const { data: current } = await supabase.from("orders").select("status").eq("id", id).single();
    await supabase.from("orders").update({ status: "refunded" }).eq("id", id);
    await supabase.from("payments").update({ status: "failed" }).eq("order_id", id);

    await supabase.from("order_status_history").insert({
      order_id: id, from_status: current?.status ?? null, to_status: "refunded", note: "Refund issued by admin",
    });

    res.json({ success: true, message: "Refund initiated" });
  } catch (err) {
    next(err);
  }
});

// ─── Notes ─────────────────────────────────────────────────────
adminOrdersRouter.post("/admin/orders/:id/notes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const { note } = req.body as { note: string };
    if (!note?.trim()) { res.status(400).json({ error: "Note is required" }); return; }

    const { data, error } = await supabase
      .from("admin_notes")
      .insert({ order_id: id, note: note.trim() })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

adminOrdersRouter.delete("/admin/orders/:id/notes/:noteId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { noteId } = req.params;
    const { error } = await supabase.from("admin_notes").delete().eq("id", noteId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default adminOrdersRouter;
