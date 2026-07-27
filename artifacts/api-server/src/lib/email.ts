import { ReplitConnectors } from "@replit/connectors-sdk";

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const fromEmail = process.env["FROM_EMAIL"] ?? "orders@leadstreamhub.com";
  const body = JSON.stringify({
    from: `LeadStream Hub <${fromEmail}>`,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
  });

  try {
    const resendApiKey = process.env["RESEND_API_KEY"];

    if (resendApiKey) {
      // Production path (Render, or anywhere non-Replit): call Resend directly.
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Resend API error ${response.status}: ${text}`);
      }
    } else {
      // Replit path: route through the Replit Resend connector proxy.
      const connectors = new ReplitConnectors();
      const response = await connectors.proxy("resend", "/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Resend API error ${response.status}: ${text}`);
      }
    }
  } catch (err) {
    // Log but don't throw — email failure shouldn't fail the whole order.
    console.error("Failed to send email:", err);
  }
}

// ─── Email template helpers ───────────────────────────────────

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060e1b;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#e0eaff;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060e1b;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <!-- Header -->
      <tr>
        <td style="background:#0a1628;border:1px solid #1d3558;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;">leadstream</span>
          <span style="font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#62d8f0;margin-left:8px;">HUB</span>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="background:#0d1b2e;border-left:1px solid #1d3558;border-right:1px solid #1d3558;padding:36px 32px;">
          ${content}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background:#080f1c;border:1px solid #1d3558;border-top:none;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4d6a8e;">LeadStream Hub · Exclusive Insurance Leads · <a href="https://leadstreamhub.com" style="color:#62d8f0;text-decoration:none;">leadstreamhub.com</a></p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function badge(label: string, color: string): string {
  return `<span style="display:inline-block;padding:4px 12px;background:${color}22;border:1px solid ${color}55;border-radius:100px;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${color};">${label}</span>`;
}

function section(title: string, content: string): string {
  return `
    <div style="margin-bottom:28px;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#7a95ba;">${title}</p>
      <div style="background:#0a1628;border:1px solid #1d3558;border-radius:12px;padding:20px;">
        ${content}
      </div>
    </div>`;
}

function row(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px;">
    <span style="color:#7a95ba;">${label}</span>
    <span style="color:#e0eaff;font-weight:600;">${value}</span>
  </div>`;
}

function divider(): string {
  return `<div style="border-top:1px solid #1d3558;margin:12px 0;"></div>`;
}

// ─── Customer Confirmation Email ──────────────────────────────

export interface OrderEmailData {
  orderNumber: string;
  customer: { firstName: string; lastName: string; email: string; phone: string; agencyName?: string };
  items: Array<{ category: string; type: string; quantity: number; priceCents: number }>;
  paymentMethod: "card" | "zelle";
  subtotalCents: number;
  feeCents: number;
  discountCents: number;
  totalCents: number;
  productAnswers: Record<string, unknown>;
  defaultSettings: Record<string, unknown>;
  additionalInstructions?: string;
  zelleScreenshotUrl?: string;
}

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export function buildCustomerEmail(data: OrderEmailData): EmailPayload {
  const itemsHtml = data.items
    .map(
      (i) =>
        `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:13px;color:#e0eaff;">✓ ${i.quantity} ${i.category} ${i.type}</span>
          <span style="font-size:13px;font-weight:700;color:#ffffff;">${money(i.priceCents)}</span>
        </div>`
    )
    .join("");

  const paymentLabel = data.paymentMethod === "card" ? "Credit / Debit Card" : "Zelle Transfer";
  const feeOrDiscount =
    data.paymentMethod === "card" && data.feeCents > 0
      ? row("Processing Fee (5%)", money(data.feeCents))
      : data.paymentMethod === "zelle" && data.discountCents > 0
        ? `<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px;">
            <span style="color:#62d8f0;">Zelle Discount (10%)</span>
            <span style="color:#62d8f0;font-weight:600;">−${money(data.discountCents)}</span>
          </div>`
        : "";

  const content = `
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#62d8f0;">Order Confirmed</p>
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.04em;">Thank you, ${data.customer.firstName}!</h1>
    <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#8fa6c4;">Your order has been received. Our team will review it and reach out to confirm delivery details.</p>

    ${badge(data.orderNumber, "#62d8f0")}

    ${section(
      "Products Ordered",
      `${itemsHtml}${divider()}
      ${row("Subtotal", money(data.subtotalCents))}
      ${feeOrDiscount}
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:14px;">
        <strong style="color:#ffffff;">Total</strong>
        <strong style="color:#ffffff;">${money(data.totalCents)}</strong>
      </div>
      ${divider()}
      ${row("Payment Method", paymentLabel)}`
    )}

    ${section(
      "What Happens Next",
      `<ol style="margin:0;padding-left:20px;color:#8fa6c4;font-size:13px;line-height:2;">
        <li>You'll receive a confirmation email within <strong style="color:#e0eaff;">10–15 minutes</strong>.</li>
        <li>Our onboarding team will review your order and contact you if any additional information is required.</li>
        <li>Once confirmed, leads will begin delivery on your preferred start date.</li>
        <li>We look forward to building a long-term partnership with you.</li>
      </ol>`
    )}

    <p style="margin:24px 0 0;font-size:12px;color:#4d6a8e;">Questions? Reply to this email or visit <a href="https://leadstreamhub.com" style="color:#62d8f0;">leadstreamhub.com</a>.</p>
  `;

  return {
    to: data.customer.email,
    subject: `Order Confirmed — ${data.orderNumber} | LeadStream Hub`,
    html: baseTemplate(content),
  };
}

// ─── Admin Notification Email ─────────────────────────────────

// ADMIN_EMAIL supports multiple recipients as a comma-separated list, e.g.
// "rohail331@gmail.com,zackbrandon503@gmail.com" — every order notification
// goes to all of them.
function getAdminEmails(): string[] {
  const raw = process.env["ADMIN_EMAIL"] ?? "admin@leadstreamhub.com";
  return raw.split(",").map((e) => e.trim()).filter(Boolean);
}

export function buildAdminEmail(data: OrderEmailData): EmailPayload {
  const adminEmail = getAdminEmails();

  const ds = data.defaultSettings as Record<string, unknown>;
  const pa = data.productAnswers as Record<string, Record<string, unknown>>;

  const defaultSettingsHtml = `
    ${row("Licensed States", Array.isArray(ds.states) ? (ds.states as string[]).join(", ") : "—")}
    ${row("Start Date", String(ds.start_date ?? "—"))}
    ${row("Availability Days", Array.isArray(ds.avail_days) ? (ds.avail_days as string[]).join(", ") : "—")}
    ${row("Availability Hours", String(ds.avail_hours ?? "—"))}
    ${row("Agency Mention", String(ds.agency_mention ?? "—"))}
  `;

  const productSectionsHtml = Object.entries(pa)
    .map(([key, answers]) => {
      const labelMap: Record<string, string> = {
        fe_cb: "FE Callback Leads",
        fe_lt: "FE Live Transfers",
        fe_pc: "FE Pre Closed Applications",
        mc_cb: "Medicare Callback Leads",
        mc_lt: "Medicare Live Transfers",
      };
      const entries = Object.entries(answers as Record<string, unknown>)
        .filter(([k]) => k !== "override")
        .map(([k, v]) => {
          const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const val = Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "—");
          return row(label, val);
        })
        .join("");
      return section(
        `${labelMap[key] ?? key}${(answers as Record<string, unknown>).override ? " (Custom Settings)" : " (Default Settings)"}`,
        entries || "<p style='color:#4d6a8e;margin:0;font-size:13px;'>No additional fields</p>"
      );
    })
    .join("");

  const paymentLabel = data.paymentMethod === "card" ? "Credit / Debit Card" : "Zelle Transfer";

  const content = `
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#fbbf24;">New Order</p>
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.04em;">${data.orderNumber}</h1>

    ${section(
      "Customer Information",
      `${row("Name", `${data.customer.firstName} ${data.customer.lastName}`)}
      ${row("Agency", data.customer.agencyName ?? "—")}
      ${row("Email", data.customer.email)}
      ${row("Phone", data.customer.phone)}`
    )}

    ${section(
      "Order Items",
      data.items
        .map((i) =>
          `<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;">
            <span style="color:#e0eaff;">✓ ${i.quantity} ${i.category} ${i.type}</span>
            <span style="color:#ffffff;font-weight:700;">${money(i.priceCents)}</span>
          </div>`
        )
        .join("") +
        divider() +
        row("Subtotal", money(data.subtotalCents)) +
        (data.feeCents > 0 ? row("Processing Fee (5%)", money(data.feeCents)) : "") +
        (data.discountCents > 0 ? row("Zelle Discount (10%)", `−${money(data.discountCents)}`) : "") +
        `<div style="display:flex;justify-content:space-between;font-size:14px;"><strong style="color:#ffffff;">Total</strong><strong style="color:#ffffff;">${money(data.totalCents)}</strong></div>`
    )}

    ${section("Default Order Settings", defaultSettingsHtml)}

    ${productSectionsHtml}

    ${section(
      "Payment",
      `${row("Method", paymentLabel)}
      ${row("Status", data.paymentMethod === "card" ? "Charged" : "Pending Verification")}
      ${data.zelleScreenshotUrl ? `<div style="margin-top:12px;"><a href="${data.zelleScreenshotUrl}" style="color:#62d8f0;font-size:12px;">View Payment Screenshot →</a></div>` : ""}`
    )}

    ${
      data.additionalInstructions
        ? section("Additional Instructions", `<p style="margin:0;font-size:13px;color:#8fa6c4;">${data.additionalInstructions}</p>`)
        : ""
    }
  `;

  return {
    to: adminEmail,
    subject: `New Order ${data.orderNumber} — ${data.customer.firstName} ${data.customer.lastName}`,
    html: baseTemplate(content),
  };
}
