import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { getSupabaseClient } from "../lib/supabase.js";
import { getStripeClient } from "../lib/stripe.js";
import { generateOrderNumber } from "../lib/order-number.js";
import {
  sendEmail,
  buildCustomerEmail,
  buildAdminEmail,
  type OrderEmailData,
} from "../lib/email.js";
import { logger } from "../lib/logger.js";

const ordersRouter = Router();

// ─── Multer (memory storage for Supabase upload) ──────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type not supported. Upload an image or PDF."));
  },
});

// ─── POST /api/orders/payment-intent ─────────────────────────
ordersRouter.post(
  "/orders/payment-intent",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount_cents } = req.body as { amount_cents: number };

      if (!amount_cents || amount_cents < 50) {
        res.status(400).json({ error: "Invalid amount." });
        return;
      }

      const stripe = getStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount_cents),
        currency: "usd",
        automatic_payment_methods: { enabled: true },
      });

      res.json({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/orders/upload ──────────────────────────────────
ordersRouter.post(
  "/orders/upload",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided." });
        return;
      }

      const supabase = getSupabaseClient();

      // Ensure the storage bucket exists (creates it if missing; safe to call if it already exists)
      await supabase.storage.createBucket("payment-screenshots", {
        public: false,
        fileSizeLimit: 15 * 1024 * 1024,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"],
      });
      // Ignore the error — Supabase returns an error if the bucket already exists, which is fine.

      const ext = req.file.originalname.split(".").pop() ?? "jpg";
      const storagePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        logger.error({ err: uploadError }, "Supabase storage upload failed");
        res.status(500).json({ error: "File upload failed: " + uploadError.message });
        return;
      }

      // Get a signed URL valid for 7 days (admin access only)
      const { data: signedData, error: signedErr } = await supabase.storage
        .from("payment-screenshots")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

      const publicUrl = signedData?.signedUrl ?? "";

      // Save file record
      const { data: fileRecord, error: dbErr } = await supabase
        .from("uploaded_files")
        .insert({
          bucket: "payment-screenshots",
          storage_path: storagePath,
          original_name: req.file.originalname,
          mime_type: req.file.mimetype,
          size_bytes: req.file.size,
          public_url: publicUrl,
        })
        .select("id")
        .single();

      if (dbErr || !fileRecord) {
        logger.error({ err: dbErr }, "Failed to save file record");
        res.status(500).json({ error: "Failed to record file." });
        return;
      }

      res.json({ file_id: fileRecord.id, url: publicUrl, path: storagePath });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/orders/submit ──────────────────────────────────
ordersRouter.post(
  "/orders/submit",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as OrderSubmitBody;

      // ── Validate ──
      if (!body.customer || !body.items?.length || !body.payment?.method) {
        res.status(400).json({ error: "Missing required fields." });
        return;
      }

      const supabase = getSupabaseClient();
      const { customer, items, payment, default_settings, product_answers, additional_instructions } = body;

      // ── Calculate totals ──
      const subtotalCents = items.reduce((s, i) => s + i.price_cents, 0);
      let feeCents = 0;
      let discountCents = 0;
      let totalCents = subtotalCents;

      if (payment.method === "card") {
        feeCents = Math.round(subtotalCents * 0.05);
        totalCents = subtotalCents + feeCents;
      } else if (payment.method === "zelle") {
        discountCents = Math.round(subtotalCents * 0.10);
        totalCents = subtotalCents - discountCents;
      }

      // ── Verify Stripe payment for card ──
      if (payment.method === "card") {
        if (!payment.payment_intent_id) {
          res.status(400).json({ error: "Payment intent ID is required for card payments." });
          return;
        }
        const stripe = getStripeClient();
        const pi = await stripe.paymentIntents.retrieve(payment.payment_intent_id);

        if (pi.status !== "succeeded") {
          res.status(402).json({ error: `Payment not completed. Status: ${pi.status}` });
          return;
        }

        // Verify amount matches (within $1 tolerance for rounding)
        if (Math.abs(pi.amount - totalCents) > 100) {
          logger.warn({ pi_amount: pi.amount, expected: totalCents }, "Payment amount mismatch");
          res.status(402).json({ error: "Payment amount mismatch." });
          return;
        }
      }

      // ── Require screenshot for Zelle ──
      if (payment.method === "zelle" && !payment.zelle_file_id) {
        res.status(400).json({ error: "Payment screenshot is required for Zelle orders." });
        return;
      }

      // ── Generate order number ──
      const orderNumber = await generateOrderNumber();

      // ── Create customer ──
      const { data: customerRecord, error: custErr } = await supabase
        .from("customers")
        .insert({
          first_name: customer.first_name,
          last_name: customer.last_name,
          agency_name: customer.agency_name ?? null,
          phone: customer.phone,
          email: customer.email,
        })
        .select("id")
        .single();

      if (custErr || !customerRecord) {
        throw new Error("Failed to create customer: " + custErr?.message);
      }

      // ── Create order ──
      const { data: orderRecord, error: orderErr } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_id: customerRecord.id,
          status: payment.method === "card" ? "confirmed" : "pending",
          payment_method: payment.method,
          subtotal_cents: subtotalCents,
          fee_cents: feeCents,
          discount_cents: discountCents,
          total_cents: totalCents,
          additional_instructions: additional_instructions ?? null,
          default_settings: default_settings ?? {},
        })
        .select("id")
        .single();

      if (orderErr || !orderRecord) {
        throw new Error("Failed to create order: " + orderErr?.message);
      }

      const orderId = orderRecord.id as string;

      // ── Create order items ──
      const { error: itemsErr } = await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: orderId,
          category: i.category,
          type: i.type,
          quantity: i.quantity,
          price_cents: i.price_cents,
          savings_cents: i.savings_cents ?? 0,
        }))
      );

      if (itemsErr) {
        logger.error({ err: itemsErr }, "Failed to insert order items");
      }

      // ── Create product answers ──
      if (product_answers && Object.keys(product_answers).length > 0) {
        const answerRows = Object.entries(product_answers).map(([key, answers]) => ({
          order_id: orderId,
          product_key: key,
          overridden: !!(answers as Record<string, unknown>).override,
          answers: answers as Record<string, unknown>,
        }));

        const { error: answersErr } = await supabase.from("product_answers").insert(answerRows);
        if (answersErr) {
          logger.error({ err: answersErr }, "Failed to insert product answers");
        }
      }

      // ── Get Zelle screenshot URL ──
      let zelleScreenshotUrl: string | undefined;
      if (payment.method === "zelle" && payment.zelle_file_id) {
        const { data: fileData } = await supabase
          .from("uploaded_files")
          .select("public_url, storage_path")
          .eq("id", payment.zelle_file_id)
          .single();

        zelleScreenshotUrl = fileData?.public_url ?? undefined;

        // Link file to order
        await supabase
          .from("uploaded_files")
          .update({ order_id: orderId })
          .eq("id", payment.zelle_file_id);
      }

      // ── Create payment record ──
      const { error: payErr } = await supabase.from("payments").insert({
        order_id: orderId,
        method: payment.method,
        status: payment.method === "card" ? "succeeded" : "pending",
        amount_cents: totalCents,
        stripe_payment_intent_id: payment.payment_intent_id ?? null,
        stripe_status: payment.method === "card" ? "succeeded" : null,
        zelle_screenshot_url: zelleScreenshotUrl ?? null,
      });

      if (payErr) {
        logger.error({ err: payErr }, "Failed to insert payment record");
      }

      // ── Build email data ──
      const emailData: OrderEmailData = {
        orderNumber,
        customer: {
          firstName: customer.first_name,
          lastName: customer.last_name,
          agencyName: customer.agency_name,
          email: customer.email,
          phone: customer.phone,
        },
        items: items.map((i) => ({
          category: i.category,
          type: i.type,
          quantity: i.quantity,
          priceCents: i.price_cents,
        })),
        paymentMethod: payment.method,
        subtotalCents,
        feeCents,
        discountCents,
        totalCents,
        productAnswers: product_answers ?? {},
        defaultSettings: default_settings ?? {},
        additionalInstructions: additional_instructions,
        zelleScreenshotUrl,
      };

      // ── Send emails (non-blocking) ──
      sendEmail(buildCustomerEmail(emailData)).catch((e) =>
        logger.error({ err: e }, "Customer email failed")
      );
      sendEmail(buildAdminEmail(emailData)).catch((e) =>
        logger.error({ err: e }, "Admin email failed")
      );

      res.json({ order_number: orderNumber, order_id: orderId });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Types ────────────────────────────────────────────────────

interface OrderSubmitBody {
  customer: {
    first_name: string;
    last_name: string;
    agency_name?: string;
    phone: string;
    email: string;
  };
  items: Array<{
    category: string;
    type: string;
    quantity: number;
    price_cents: number;
    savings_cents?: number;
  }>;
  payment: {
    method: "card" | "zelle";
    payment_intent_id?: string;
    zelle_file_id?: string;
  };
  default_settings?: Record<string, unknown>;
  product_answers?: Record<string, Record<string, unknown>>;
  additional_instructions?: string;
}

export default ordersRouter;
