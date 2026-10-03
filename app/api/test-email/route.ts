import { NextResponse, NextRequest } from "next/server";
import { isEmailConfigured, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/test-email
 * Checks if Gmail SMTP credentials are configured.
 */
export async function GET() {
  const configured = isEmailConfigured();
  return NextResponse.json({
    configured,
    gmailUser: process.env.GMAIL_USER ? process.env.GMAIL_USER.replace(/(.{2})(.*)(@.*)/, "$1***$3") : null,
    instructions: configured
      ? "Gmail SMTP is configured. Send a POST request with { \"to\": \"your-email@example.com\" } to send a test email."
      : "Gmail SMTP is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to your .env or .env.local file.",
  });
}

/**
 * POST /api/test-email
 * Sends a test email to verify Gmail credentials.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const recipient = body.to || process.env.GMAIL_USER;

    if (!recipient) {
      return NextResponse.json(
        {
          error: "Recipient email is required. Provide { \"to\": \"your-email@example.com\" } in the request body.",
        },
        { status: 400 }
      );
    }

    // In production, restrict recipient to the configured admin email to prevent open relay abuse
    if (process.env.NODE_ENV === "production" && recipient !== process.env.GMAIL_USER) {
      return NextResponse.json(
        {
          error: "In production, test emails can only be dispatched to the configured admin email.",
        },
        { status: 403 }
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error: "Gmail SMTP is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in your environment.",
        },
        { status: 400 }
      );
    }

    const testHtml = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #2563eb; margin-top: 0;">Sellora Gmail Notification Test</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">
          This is a test notification from your Sellora marketplace server. If you received this email, your Gmail SMTP configuration is working properly!
        </p>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; color: #64748b;">
          Timestamp: ${new Date().toISOString()}
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: recipient,
      subject: "Test Notification: Gmail SMTP configured for Sellora",
      html: testHtml,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          hint: "Ensure you are using a 16-character Google App Password (not your normal Gmail password), and that 2-Step Verification is enabled on your Google Account.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${recipient}`,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error("Error in POST /api/test-email:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process test email" },
      { status: 500 }
    );
  }
}
