import nodemailer, { type Transporter } from "nodemailer";
import type { Order, OrderItem } from "@/types/order";

// Cached nodemailer transporter
let transporter: Transporter | null = null;

/**
 * Checks whether Gmail SMTP credentials are configured in the environment.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/**
 * Returns a singleton nodemailer transporter configured for Gmail SMTP.
 */
function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Base helper to send an email via Gmail SMTP.
 * Never throws — catches errors and returns { success, error } so business flows never break.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const mailer = getTransporter();

    if (!mailer) {
      console.warn(
        "[Sellora Email] Skipping email notification: GMAIL_USER or GMAIL_APP_PASSWORD is not set in environment."
      );
      return { success: false, error: "Gmail credentials not configured" };
    }

    const fromAddress =
      process.env.GMAIL_FROM ||
      `"Sellora Marketplace" <${process.env.GMAIL_USER}>`;

    const info = await mailer.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      replyTo: replyTo || process.env.GMAIL_USER,
    });

    console.log(`[Sellora Email] Sent "${subject}" to <${to}> [ID: ${info.messageId}]`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Sellora Email] Failed to send email to <${to}>:`, err?.message || err);
    return { success: false, error: err?.message || "Failed to send email" };
  }
}

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/**
 * Email Template: Order Confirmation sent to the Buyer
 */
export async function sendOrderConfirmationEmail(
  order: Order,
  options?: {
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
    whatsappPhone?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const recipient = order.shippingAddress.email || order.customerEmail;
  if (!recipient) {
    return { success: false, error: "Recipient email is missing from order" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sellora.ng";
  const trackingUrl = `${siteUrl}/account/orders?id=${order.id}`;
  const isTransfer = order.payment?.method?.toLowerCase().includes("transfer");

  const bankName =
    options?.bankDetails?.bankName ||
    process.env.NEXT_PUBLIC_STORE_BANK_NAME ||
    "OPay";
  const accountNumber =
    options?.bankDetails?.accountNumber ||
    process.env.NEXT_PUBLIC_STORE_ACCOUNT_NUMBER ||
    "8038737198";
  const accountName =
    options?.bankDetails?.accountName ||
    process.env.NEXT_PUBLIC_STORE_ACCOUNT_NAME ||
    "Divine Joshua David";
  const whatsappNum =
    options?.whatsappPhone ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    "2348038737198";

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${
              item.image
                ? `<img src="${item.image}" alt="${item.name}" width="54" height="54" style="border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; margin-right: 12px; vertical-align: middle;" />`
                : ""
            }
            <div style="display: inline-block; vertical-align: middle;">
              <strong style="color: #0f172a; font-size: 14px; display: block;">${item.name}</strong>
              <span style="color: #64748b; font-size: 12px;">Qty: ${item.quantity} × ${currency.format(item.price)}</span>
            </div>
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-weight: 600; font-size: 14px;">
          ${currency.format(item.price * item.quantity)}
        </td>
      </tr>
    `
    )
    .join("");

  const bankDetailsBlock = isTransfer
    ? `
    <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 18px; margin: 24px 0;">
      <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 15px; display: flex; align-items: center; gap: 6px;">
        💳 Direct Bank Transfer Payment Instructions
      </h3>
      <p style="margin: 0 0 12px 0; color: #1e3a8a; font-size: 13px; line-height: 1.5;">
        Please transfer <strong>${currency.format(order.pricing.total)}</strong> to the merchant bank account below to finalize and ship your order:
      </p>
      <div style="background: #ffffff; border-radius: 8px; padding: 12px; border: 1px solid #dbeafe; font-size: 13px; color: #1e293b;">
        <div style="margin-bottom: 4px;"><strong>Bank Name:</strong> ${bankName}</div>
        <div style="margin-bottom: 4px;"><strong>Account Number:</strong> <span style="font-family: monospace; font-size: 15px; font-weight: 700; color: #2563eb;">${accountNumber}</span></div>
        <div><strong>Account Name:</strong> ${accountName}</div>
      </div>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #3b82f6;">
        After making payment, please send your proof of payment or screenshot on WhatsApp to <strong>+${whatsappNum}</strong> for immediate verification.
      </p>
    </div>
  `
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - #${order.orderNumber}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Sellora Marketplace</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Order Confirmation & Receipt</p>
          </div>

          <!-- Body -->
          <div style="padding: 28px 24px;">
            <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0;">
              Thank you for your order, ${order.shippingAddress.fullName}!
            </h2>
            <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0; line-height: 1.5;">
              We have received your order <strong>#${order.orderNumber}</strong>. We're processing your items and will notify you as soon as your shipment is dispatched.
            </p>

            ${bankDetailsBlock}

            <!-- Order Summary Table -->
            <h3 style="font-size: 15px; font-weight: 700; margin: 24px 0 12px 0; color: #0f172a;">Items in Your Order</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Pricing Breakdown -->
            <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13.5px; color: #475569;">
                <span>Subtotal:</span>
                <span style="font-weight: 600; color: #0f172a;">${currency.format(order.pricing.subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13.5px; color: #475569;">
                <span>Shipping Fee (${order.shippingMethod}):</span>
                <span style="font-weight: 600; color: #0f172a;">${currency.format(order.pricing.shippingFee)}</span>
              </div>
              ${
                order.pricing.discount
                  ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13.5px; color: #16a34a;">
                  <span>Discount Applied:</span>
                  <span style="font-weight: 600;">-${currency.format(order.pricing.discount)}</span>
                </div>
              `
                  : ""
              }
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 10px 0;" />
              <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #0f172a;">
                <span>Total Amount:</span>
                <span style="color: #2563eb;">${currency.format(order.pricing.total)}</span>
              </div>
            </div>

            <!-- Shipping Information -->
            <h3 style="font-size: 15px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a;">Shipping Details</h3>
            <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 14px; font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
              <div><strong>Recipient:</strong> ${order.shippingAddress.fullName}</div>
              <div><strong>Phone:</strong> ${order.shippingAddress.phone}</div>
              <div><strong>Delivery Address:</strong> ${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state}</div>
              <div><strong>Carrier:</strong> ${order.carrier} (Estimated: ${new Date(order.estimatedDelivery).toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" })})</div>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin: 32px 0 16px 0;">
              <a href="${trackingUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                Track Your Order Live
              </a>
            </div>

            <p style="text-align: center; font-size: 12px; color: #94a3b8; margin: 20px 0 0 0;">
              If you have any questions or need to modify your delivery address, reply directly to this email or reach us on WhatsApp.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 4px 0;">© ${new Date().getFullYear()} Sellora Marketplace. All rights reserved.</p>
            <p style="margin: 0;">Empowering African commerce with verified independent merchants.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: recipient,
    subject: `Order Confirmed: #${order.orderNumber} - Sellora`,
    html,
  });
}

/**
 * Email Template: Notification sent to the Store Owner / Merchant
 */
export async function sendMerchantNewOrderAlert(
  order: Order,
  merchantEmail: string,
  storeName: string,
  options?: {
    merchantItems?: OrderItem[];
  }
): Promise<{ success: boolean; error?: string }> {
  if (!merchantEmail) {
    return { success: false, error: "Merchant email is missing" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sellora.ng";
  const manageUrl = `${siteUrl}/account/manage-store`;

  const itemsToRender =
    options?.merchantItems && options.merchantItems.length > 0
      ? options.merchantItems
      : order.items;
  const merchantTotal = itemsToRender.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  );

  const itemsHtml = itemsToRender
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; color: #0f172a;">
          <strong>${item.name}</strong> × ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13.5px; font-weight: 600; color: #0f172a;">
          ${currency.format(item.price * item.quantity)}
        </td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order Received: #${order.orderNumber}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800;">🎉 New Order Received!</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">Store: <strong>${storeName}</strong></p>
          </div>

          <div style="padding: 28px 24px;">
            <p style="font-size: 14.5px; color: #334155; line-height: 1.5; margin: 0 0 20px 0;">
              Great news! A new order <strong>#${order.orderNumber}</strong> was just placed for your storefront. Please prepare the items for dispatch.
            </p>

            <!-- Customer Details Card -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
              <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px;">Customer Contact & Shipping Address</h4>
              <div><strong>Name:</strong> ${order.shippingAddress.fullName}</div>
              <div><strong>Phone:</strong> <a href="tel:${order.shippingAddress.phone}" style="color: #2563eb; text-decoration: none;">${order.shippingAddress.phone}</a></div>
              <div><strong>Email:</strong> ${order.shippingAddress.email || order.customerEmail || "N/A"}</div>
              <div><strong>Destination:</strong> ${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state}</div>
              <div><strong>Payment Method:</strong> ${order.payment?.method || "Direct Bank Transfer"} (${order.payment?.status || "PENDING"})</div>
            </div>

            <!-- Items Table -->
            <h4 style="margin: 20px 0 10px 0; color: #0f172a; font-size: 14px;">Items Ordered</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <span style="font-size: 14px; font-weight: 700; color: #065f46;">Store Items Total:</span>
              <span style="font-size: 18px; font-weight: 800; color: #059669;">${currency.format(merchantTotal)}</span>
            </div>

            <div style="text-align: center; margin: 30px 0 10px 0;">
              <a href="${manageUrl}" style="display: inline-block; background: #059669; color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
                Manage Order in Dashboard
              </a>
            </div>
          </div>

          <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
            Sellora Merchant Notifications • Manage orders, stock, and payouts
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: merchantEmail,
    subject: `🔔 New Order #${order.orderNumber} received for ${storeName}`,
    html,
  });
}

/**
 * Email Template: Order Status Update (e.g. Dispatched / In Transit / Delivered)
 */
export async function sendOrderStatusUpdateEmail(
  order: Order,
  status: string,
  trackingEventTitle?: string
): Promise<{ success: boolean; error?: string }> {
  const recipient = order.shippingAddress.email || order.customerEmail;
  if (!recipient) {
    return { success: false, error: "Recipient email is missing from order" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sellora.ng";
  const trackingUrl = `${siteUrl}/account/orders?id=${order.id}`;

  const statusLabel =
    status === "DELIVERED"
      ? "Delivered"
      : status === "IN_TRANSIT"
      ? "In Transit (Dispatched)"
      : status === "PROCESSING"
      ? "Processing & Packaging"
      : status === "CANCELLED"
      ? "Cancelled"
      : status;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update - #${order.orderNumber}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <div style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Shipment Status Update</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Order #${order.orderNumber}</p>
          </div>

          <div style="padding: 28px 24px;">
            <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a;">
              Hello ${order.shippingAddress.fullName},
            </h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
              Your order status has changed to: <strong style="color: #2563eb; font-size: 15px;">${statusLabel}</strong>
            </p>

            ${
              trackingEventTitle
                ? `
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #166534;">
                <strong>Latest Checkpoint:</strong> ${trackingEventTitle}
              </div>
            `
                : ""
            }

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; font-size: 13px; margin-bottom: 24px; line-height: 1.6;">
              <div><strong>Carrier:</strong> ${order.carrier}</div>
              <div><strong>Tracking Number:</strong> <span style="font-family: monospace; font-weight: 700;">${order.trackingNumber}</span></div>
              <div><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString("en-NG", { weekday: "long", month: "short", day: "numeric" })}</div>
            </div>

            <div style="text-align: center; margin: 30px 0 10px 0;">
              <a href="${trackingUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                View Full Tracking Details
              </a>
            </div>
          </div>

          <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
            Sellora Marketplace Customer Care
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: recipient,
    subject: `Update on Order #${order.orderNumber}: ${statusLabel}`,
    html,
  });
}

/**
 * Email Template: Admin Platform Alert when any order is placed on Sellora
 */
export async function sendAdminNewOrderAlert(
  order: Order
): Promise<{ success: boolean; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
  if (!adminEmail) {
    return { success: false, error: "Admin email not configured" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sellora.ng";
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; padding: 20px; color: #0f172a;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #2563eb; margin: 0 0 12px 0;">📦 Platform Order Alert: #${order.orderNumber}</h2>
          <p style="font-size: 14px; color: #334155; line-height: 1.5;">
            A new order of <strong>${currency.format(order.pricing.total)}</strong> was placed on Sellora.
          </p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 13px; line-height: 1.6; margin: 16px 0;">
            <div><strong>Store:</strong> ${order.store?.name || "Sellora Store"}</div>
            <div><strong>Buyer:</strong> ${order.shippingAddress.fullName} (${order.shippingAddress.phone})</div>
            <div><strong>Email:</strong> ${order.shippingAddress.email || order.customerEmail || "N/A"}</div>
            <div><strong>Payment Method:</strong> ${order.payment?.method || "Direct Bank Transfer"} (${order.payment?.status || "PENDING"})</div>
            <div><strong>Items Ordered:</strong> ${order.items.length} product(s)</div>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${siteUrl}/account/orders?id=${order.id}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700;">
              View Order in Admin
            </a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `🛒 [Sellora Platform] New Order #${order.orderNumber} - ${currency.format(order.pricing.total)}`,
    html,
  });
}

/**
 * Email Template: Alert to Merchant when an order is cancelled
 */
export async function sendMerchantOrderCancelledAlert(
  order: Order,
  merchantEmail: string,
  storeName: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!merchantEmail) {
    return { success: false, error: "Merchant email is missing" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sellora.ng";
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; padding: 20px; color: #0f172a;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #fee2e2; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #dc2626; margin: 0 0 12px 0;">⚠️ Order #${order.orderNumber} Cancelled</h2>
          <p style="font-size: 14px; color: #334155; line-height: 1.5;">
            An order for <strong>${storeName}</strong> has been cancelled.
          </p>
          ${
            reason
              ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; font-size: 13px; color: #991b1b; margin: 16px 0;">
                  <strong>Cancellation Reason:</strong> ${reason}
                </div>`
              : ""
          }
          <div style="font-size: 13px; color: #64748b; margin-bottom: 20px; line-height: 1.6;">
            <div><strong>Customer:</strong> ${order.shippingAddress.fullName}</div>
            <div><strong>Order Value:</strong> ${currency.format(order.pricing.total)}</div>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${siteUrl}/account/manage-store" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700;">
              Review in Store Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: merchantEmail,
    subject: `⚠️ Order #${order.orderNumber} Cancelled - ${storeName}`,
    html,
  });
}

/**
 * Email Template: Sent to newly registered users
 */
export async function sendWelcomeUserEmail({
  to,
  displayName,
}: {
  to: string;
  displayName?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!to) {
    return { success: false, error: "Recipient email is missing" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sellora.ng";
  const name = displayName || "there";

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Welcome to Sellora! 🛍️</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Your marketplace for verified independent African brands</p>
          </div>
          <div style="padding: 28px 24px;">
            <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">Hello ${name},</h2>
            <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
              We are thrilled to have you join Sellora. Discover thousands of authentic products directly from certified storefronts across Nigeria with secure nationwide delivery.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
              <h4 style="margin: 0 0 10px 0; color: #2563eb; font-size: 15px;">What you can do on Sellora:</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.7;">
                <li><strong>Shop Verified Stores:</strong> Direct-from-source authentic goods with tracked shipping.</li>
                <li><strong>Sell & Grow:</strong> Open your own custom merchant storefront in minutes.</li>
                <li><strong>Safe Transactions:</strong> Direct bank transfers and transparent order checkpoints.</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0 10px 0;">
              <a href="${siteUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                Explore Products Now
              </a>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
            Sellora Marketplace • Connecting buyers with authentic creators
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Welcome to Sellora, ${name}! 🛍️`,
    html,
  });
}

/**
 * Email Template: Sent to a merchant when they launch a storefront
 */
export async function sendStoreCreatedEmail({
  to,
  storeName,
  storeSlug,
  storeUrl,
}: {
  to: string;
  storeName: string;
  storeSlug: string;
  storeUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!to) {
    return { success: false, error: "Recipient email is missing" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sellora.ng";
  const dashboardUrl = `${siteUrl}/account/manage-store`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Congratulations! 🎉</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Your store <strong>${storeName}</strong> is now live!</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
              Your merchant storefront is officially published on Sellora. Customers nationwide can now discover your products, follow your store, and place orders.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <h4 style="margin: 0 0 8px 0; color: #065f46; font-size: 14px;">Your Public Store Link:</h4>
              <a href="${storeUrl}" style="color: #059669; font-weight: 700; font-size: 15px; word-break: break-all;">${storeUrl}</a>
            </div>
            <div style="text-align: center; margin: 30px 0 10px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #059669; color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
                Go to Store Dashboard
              </a>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
            Sellora Merchant Network • Grow your business with confidence
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `🎉 Your store "${storeName}" is live on Sellora!`,
    html,
  });
}

/**
 * Email Template: Sent when a store upgrades to Premium
 */
export async function sendStoreUpgradeEmail({
  to,
  storeName,
  subdomainUrl,
  transactionRef,
}: {
  to: string;
  storeName: string;
  subdomainUrl: string;
  transactionRef: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!to) {
    return { success: false, error: "Recipient email is missing" };
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">⭐ Premium Storefront Activated!</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Store: <strong>${storeName}</strong></p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
              Congratulations! Your Premium subscription is active. Your store now features a verified badge, priority listing, and a standalone custom subdomain:
            </p>
            <div style="background: #f5f3ff; border: 1.5px solid #ddd6fe; border-radius: 12px; padding: 18px; margin-bottom: 24px; text-align: center;">
              <span style="font-size: 12px; text-transform: uppercase; font-weight: 800; color: #7c3aed; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Standalone Subdomain</span>
              <a href="${subdomainUrl}" style="color: #6366f1; font-weight: 800; font-size: 17px; text-decoration: none;">${subdomainUrl}</a>
            </div>
            <div style="font-size: 12px; color: #64748b; background: #f8fafc; padding: 10px 14px; border-radius: 8px;">
              <strong>Payment Reference:</strong> ${transactionRef}
            </div>
          </div>
          <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
            Sellora Premium Merchant Services
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `⭐ Premium Activated for ${storeName} - Sellora`,
    html,
  });
}
