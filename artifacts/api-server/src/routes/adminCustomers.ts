import { Router, type Request, type Response, type NextFunction } from "express";
import { getSupabaseClient } from "../lib/supabase.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const adminCustomersRouter = Router();
adminCustomersRouter.use(requireAdmin);

// GET /api/admin/customers
adminCustomersRouter.get("/admin/customers", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { page = "1", limit = "25", search } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from("customers")
      .select(`id, first_name, last_name, agency_name, email, phone, created_at, orders(id, total_cents, created_at)`, { count: "exact" });

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,agency_name.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    type OrderRow = { total_cents: number; created_at: string };

    const customers = (data ?? []).map((c: Record<string, unknown>) => {
      const orders = (c.orders as OrderRow[]) ?? [];
      const totalSpent = orders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
      const lastOrder = orders.length > 0
        ? orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null;
      return {
        id: c.id, first_name: c.first_name, last_name: c.last_name,
        agency_name: c.agency_name ?? null, email: c.email, phone: c.phone,
        order_count: orders.length, total_spent_cents: totalSpent,
        last_order_at: lastOrder, created_at: c.created_at,
      };
    });

    res.json({ customers, total: count ?? 0, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/customers/:id
adminCustomersRouter.get("/admin/customers/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    const [custRes, ordersRes] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase
        .from("orders")
        .select(`
          id, order_number, status, payment_method, total_cents, subtotal_cents, fee_cents, discount_cents, created_at,
          customers!inner(first_name, last_name, agency_name, email),
          payments(status),
          order_items(id)
        `)
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (custRes.error || !custRes.data) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    type CustomerRow = { first_name: string; last_name: string; agency_name: string | null; email: string };
    type PaymentRow = { status: string };

    const orders = (ordersRes.data ?? []).map((o: Record<string, unknown>) => {
      const cust = (Array.isArray(o.customers) ? o.customers[0] : o.customers) as CustomerRow;
      const pmts = (o.payments as PaymentRow[]) ?? [];
      return {
        id: o.id, order_number: o.order_number,
        customer_name: `${cust?.first_name ?? ""} ${cust?.last_name ?? ""}`.trim(),
        customer_email: cust?.email ?? "", agency_name: cust?.agency_name ?? null,
        status: o.status, payment_method: o.payment_method,
        payment_status: pmts[0]?.status ?? "unknown",
        total_cents: o.total_cents, subtotal_cents: o.subtotal_cents,
        fee_cents: o.fee_cents, discount_cents: o.discount_cents,
        item_count: Array.isArray(o.order_items) ? o.order_items.length : 0,
        created_at: o.created_at,
      };
    });

    res.json({ customer: custRes.data, orders });
  } catch (err) {
    next(err);
  }
});

export default adminCustomersRouter;
