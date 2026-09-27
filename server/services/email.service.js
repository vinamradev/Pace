import nodemailer from "nodemailer";

/**
 * Configure email transporter
 * Seamlessly supports Gmail, Outlook, AWS SES, Brevo, custom SMTP,
 * and automatically falls back to a development console logger if SMTP credentials are not yet configured in .env.
 */
let transporter = null;
let isDevMockMode = false;

export function initializeEmailService() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    try {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      isDevMockMode = false;
      console.log(`[PACE Email Service] Configured live SMTP transport via ${host}:${port} (${user})`);
    } catch (err) {
      console.error("[PACE Email Service] Failed to initialize SMTP transport:", err.message);
      isDevMockMode = true;
    }
  } else {
    isDevMockMode = true;
    console.log(
      "[PACE Email Service] Notice: SMTP_USER and SMTP_PASS not set in .env. Email notifications are running in DEV MOCK mode (emails & OTPs will be displayed directly in server terminal)."
    );
  }
}

// Initial transporter setup
initializeEmailService();

/**
 * Send email helper with automatic fallback
 */
async function sendMailHelper({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || '"PACE Finance" <no-reply@pace.finance>';

  if (!isDevMockMode && transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text: text || subject,
        html,
      });
      console.log(`[PACE Email Service] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, mode: "smtp" };
    } catch (error) {
      console.error(`[PACE Email Service] Failed to send email to ${to}:`, error.message);
      console.log(`[PACE Email Service Fallback] Re-routing email to terminal log for developer visibility.`);
      // Fallback to console output so user operations never fail
      logEmailToConsole({ to, subject, text, html });
      return { success: true, mode: "fallback_logged", error: error.message };
    }
  }

  // Developer mock mode
  logEmailToConsole({ to, subject, text, html });
  return { success: true, mode: "dev_mock" };
}

function logEmailToConsole({ to, subject, text, html }) {
  console.log("\n==================== [PACE EMAIL NOTIFICATION] ====================");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  if (text) {
    console.log(`Text preview: ${text.slice(0, 300)}...`);
  }
  // If there's an OTP code in html or text, highlight it
  const otpMatch = (text || html || "").match(/\b\d{6}\b/);
  if (otpMatch) {
    console.log(`🔑 >>> EXTRACTED OTP CODE: [ ${otpMatch[0]} ] <<<`);
  }
  console.log("===================================================================\n");
}

/* ==========================================================================
   EMAIL TEMPLATES (Modern PACE Dark Violet & Gold Theme)
   ========================================================================== */

function getEmailHeader() {
  return `
    <div style="background: #09090c; padding: 28px 24px; text-align: center; border-bottom: 2px solid #232232;">
      <div style="display: inline-block; background: linear-gradient(135deg, #ffb703, #fb8500); width: 44px; height: 44px; border-radius: 12px; line-height: 44px; font-size: 22px; font-weight: 900; color: #000; margin-bottom: 10px;">
        P
      </div>
      <h1 style="margin: 0; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 800; letter-spacing: 2px;">
        PACE
      </h1>
      <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px; font-family: sans-serif;">
        Spend with intention. Save with purpose.
      </p>
    </div>
  `;
}

function getEmailFooter() {
  return `
    <div style="background: #0d0c14; padding: 20px; text-align: center; border-top: 1px solid #1f1e2c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px;">
        This email was sent securely by PACE Personal Finance.
      </p>
      <p style="margin: 0; color: #475569; font-size: 11px;">
        © ${new Date().getFullYear()} PACE Finance App. All rights reserved. • High-Security Banking Grade Protection
      </p>
    </div>
  `;
}

/**
 * 1. Welcome Email
 */
export async function sendWelcomeEmail({ to, name }) {
  const subject = `Welcome to PACE, ${name}! 🎉`;
  const html = `
    <div style="background: #07070a; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #242335; color: #f1f5f9;">
      ${getEmailHeader()}
      <div style="padding: 32px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        <h2 style="color: #f8fafc; margin-top: 0; font-size: 20px;">Welcome aboard, ${name}! 🚀</h2>
        <p style="color: #cbd5e1; font-size: 15px;">
          Your PACE Personal Finance account has been successfully created. You're now equipped with powerful tools to track spending, master budgeting, and build lasting wealth.
        </p>
        <div style="background: #141320; border: 1px solid #2d2b45; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #ffb703; font-size: 16px;">Key Security Features Active on Your Account:</h3>
          <ul style="color: #94a3b8; font-size: 14px; margin-bottom: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;"><strong style="color: #e2e8f0;">End-to-End JWT Authentication:</strong> Bank-grade token encryption.</li>
            <li style="margin-bottom: 8px;"><strong style="color: #e2e8f0;">Multi-Factor OTP Guard:</strong> Instant email verification on sensitive actions.</li>
            <li style="margin-bottom: 8px;"><strong style="color: #e2e8f0;">Budget Guard Alerts:</strong> Real-time proactive alerts when spending reaches your threshold.</li>
            <li><strong style="color: #e2e8f0;">Isolated Data Encryption:</strong> Your financial data is strictly accessible only by you.</li>
          </ul>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">
          Ready to log your first transaction or set up a financial goal? Log in anytime from your browser or mobile app.
        </p>
      </div>
      ${getEmailFooter()}
    </div>
  `;

  return sendMailHelper({
    to,
    subject,
    html,
    text: `Welcome to PACE, ${name}! Your account is now active and protected with bank-grade security.`,
  });
}

/**
 * 2. Login Security Alert Email
 */
export async function sendLoginAlertEmail({ to, name, ip, time, userAgent }) {
  const subject = `Security Alert: New Sign-in to Your PACE Account 🛡️`;
  const formattedTime = time || new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

  const html = `
    <div style="background: #07070a; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #242335; color: #f1f5f9;">
      ${getEmailHeader()}
      <div style="padding: 32px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        <div style="background: rgba(59, 130, 246, 0.12); border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
          <strong style="color: #60a5fa; font-size: 14px;">🛡️ Security Notification</strong>
        </div>
        <h2 style="color: #f8fafc; margin-top: 0; font-size: 20px;">New Login Detected</h2>
        <p style="color: #cbd5e1; font-size: 15px;">
          Hello ${name}, a new sign-in to your PACE account was just registered with the following details:
        </p>
        <div style="background: #141320; border: 1px solid #2d2b45; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #94a3b8; padding: 6px 0; width: 35%;">Date & Time:</td>
              <td style="color: #f1f5f9; font-weight: 600;">${formattedTime}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">IP Address:</td>
              <td style="color: #f1f5f9; font-family: monospace;">${ip || "Protected"}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Device / Browser:</td>
              <td style="color: #f1f5f9;">${userAgent ? userAgent.slice(0, 60) : "Web Browser"}</td>
            </tr>
          </table>
        </div>
        <p style="color: #ef4444; font-size: 13px; font-weight: 500;">
          If this was you, you can safely ignore this email. If you did NOT initiate this sign-in, please immediately reset your password and check your account.
        </p>
      </div>
      ${getEmailFooter()}
    </div>
  `;

  return sendMailHelper({
    to,
    subject,
    html,
    text: `New login to your PACE account for ${name} at ${formattedTime}. IP: ${ip || "Protected"}. If this wasn't you, reset your password immediately.`,
  });
}

/**
 * 3. Password Reset OTP Email
 */
export async function sendPasswordResetOtpEmail({ to, name, otp, expiresInMinutes = 10 }) {
  const subject = `PACE Password Reset OTP: ${otp} 🔑`;
  const html = `
    <div style="background: #07070a; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #242335; color: #f1f5f9;">
      ${getEmailHeader()}
      <div style="padding: 32px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; text-align: center;">
        <h2 style="color: #f8fafc; margin-top: 0; font-size: 22px;">Reset Your Password</h2>
        <p style="color: #cbd5e1; font-size: 15px; margin-bottom: 24px;">
          Hello ${name}, use the one-time verification code below to securely reset your PACE account password.
        </p>

        <div style="background: #141320; border: 2px dashed #ffb703; border-radius: 12px; padding: 22px; display: inline-block; margin: 0 auto 24px auto;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #ffb703;">
            ${otp}
          </span>
        </div>

        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px 0;">
          ⏳ This code is valid for <strong>${expiresInMinutes} minutes</strong> and can only be used once.
        </p>
        <div style="background: rgba(239, 68, 68, 0.1); border-radius: 8px; padding: 12px; font-size: 13px; color: #fca5a5; max-width: 440px; margin: 0 auto;">
          ⚠️ Never share this OTP with anyone. PACE support representatives will never ask for your verification code.
        </div>
      </div>
      ${getEmailFooter()}
    </div>
  `;

  return sendMailHelper({
    to,
    subject,
    html,
    text: `Your PACE password reset OTP is: ${otp}. This code is valid for ${expiresInMinutes} minutes. Do not share it with anyone.`,
  });
}

/**
 * 4. Password Changed Confirmation Email
 */
export async function sendPasswordChangedEmail({ to, name, time }) {
  const subject = `Your PACE Account Password Has Been Updated ✅`;
  const formattedTime = time || new Date().toLocaleString();

  const html = `
    <div style="background: #07070a; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #242335; color: #f1f5f9;">
      ${getEmailHeader()}
      <div style="padding: 32px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        <h2 style="color: #10b981; margin-top: 0; font-size: 20px;">Password Changed Successfully</h2>
        <p style="color: #cbd5e1; font-size: 15px;">
          Hello ${name}, the password for your PACE account (${to}) was successfully updated on ${formattedTime}.
        </p>
        <p style="color: #94a3b8; font-size: 14px;">
          You can now log in using your new password across all your devices.
        </p>
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 14px; margin-top: 20px;">
          <p style="color: #f87171; font-size: 13px; margin: 0;">
            <strong>Did not make this change?</strong> If you did not authorize this password update, please contact support or immediately trigger an account recovery.
          </p>
        </div>
      </div>
      ${getEmailFooter()}
    </div>
  `;

  return sendMailHelper({
    to,
    subject,
    html,
    text: `Your PACE account password was successfully updated on ${formattedTime}. If you did not do this, take action immediately.`,
  });
}

/**
 * 5. Budget Guard Threshold Alert Email
 */
export async function sendBudgetAlertEmail({
  to,
  name,
  spent,
  budget,
  percent,
  threshold,
  currency = "₹",
}) {
  const subject = `🚨 PACE Budget Alert: ${percent}% of Monthly Budget Used!`;
  const remaining = Math.max(0, budget - spent);

  const html = `
    <div style="background: #07070a; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #242335; color: #f1f5f9;">
      ${getEmailHeader()}
      <div style="padding: 32px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        <div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
          <strong style="color: #fbbf24; font-size: 14px;">⚠️ Spending Guard Activated (${threshold}% Threshold Reached)</strong>
        </div>
        <h2 style="color: #f8fafc; margin-top: 0; font-size: 20px;">Attention, ${name}!</h2>
        <p style="color: #cbd5e1; font-size: 15px;">
          You have reached <strong style="color: #f59e0b;">${percent}%</strong> of your monthly spending budget. PACE Spending Guard is alerting you to help you stay on track!
        </p>

        <!-- Progress Bar -->
        <div style="background: #1e1d2c; border-radius: 999px; height: 16px; overflow: hidden; margin: 20px 0;">
          <div style="background: linear-gradient(90deg, #f59e0b, #ef4444); width: ${Math.min(
            percent,
            100
          )}%; height: 100%; border-radius: 999px;"></div>
        </div>

        <div style="background: #141320; border: 1px solid #2d2b45; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Total Monthly Budget:</td>
              <td style="color: #f1f5f9; font-weight: 700; text-align: right;">${currency}${budget.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Current Spending:</td>
              <td style="color: #ef4444; font-weight: 700; text-align: right;">${currency}${spent.toLocaleString()}</td>
            </tr>
            <tr style="border-top: 1px solid #242335;">
              <td style="color: #94a3b8; padding: 8px 0 0 0;">Remaining Safe Allowance:</td>
              <td style="color: #10b981; font-weight: 700; text-align: right; padding-top: 8px;">${currency}${remaining.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px;">
          💡 Tip: Review your recent discretionary purchases in PACE and postpone non-essential shopping until next month.
        </p>
      </div>
      ${getEmailFooter()}
    </div>
  `;

  return sendMailHelper({
    to,
    subject,
    html,
    text: `PACE Budget Alert: You have used ${percent}% of your monthly budget (${currency}${spent} of ${currency}${budget}). Safe remaining: ${currency}${remaining}.`,
  });
}

/**
 * 6. Financial Summary & Statement Email
 */
export async function sendFinancialSummaryEmail({
  to,
  name,
  totalExpense = 0,
  totalIncome = 0,
  topCategory = "Food",
  txCount = 0,
  currency = "₹",
}) {
  const subject = `📊 Your PACE Financial Spending Summary`;
  const netSavings = totalIncome - totalExpense;

  const html = `
    <div style="background: #07070a; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #242335; color: #f1f5f9;">
      ${getEmailHeader()}
      <div style="padding: 32px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        <h2 style="color: #f8fafc; margin-top: 0; font-size: 20px;">Financial Snapshot for ${name} 📈</h2>
        <p style="color: #cbd5e1; font-size: 15px;">
          Here is your on-demand spending and financial analysis from PACE:
        </p>

        <div style="display: flex; gap: 12px; margin: 20px 0;">
          <div style="background: #141320; border: 1px solid #2d2b45; border-radius: 12px; padding: 16px; width: 48%; text-align: center;">
            <div style="color: #94a3b8; font-size: 12px;">TOTAL EXPENSES</div>
            <div style="color: #ef4444; font-size: 20px; font-weight: 800; margin-top: 4px;">${currency}${totalExpense.toLocaleString()}</div>
          </div>
          <div style="background: #141320; border: 1px solid #2d2b45; border-radius: 12px; padding: 16px; width: 48%; text-align: center;">
            <div style="color: #94a3b8; font-size: 12px;">TOTAL INCOME</div>
            <div style="color: #10b981; font-size: 20px; font-weight: 800; margin-top: 4px;">${currency}${totalIncome.toLocaleString()}</div>
          </div>
        </div>

        <div style="background: #141320; border: 1px solid #2d2b45; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Net Financial Balance:</td>
              <td style="color: ${netSavings >= 0 ? "#10b981" : "#ef4444"}; font-weight: 700; text-align: right;">
                ${currency}${netSavings.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Transactions Logged:</td>
              <td style="color: #f1f5f9; font-weight: 600; text-align: right;">${txCount}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Primary Spending Category:</td>
              <td style="color: #ffb703; font-weight: 700; text-align: right;">${topCategory}</td>
            </tr>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px;">
          To view in-depth category charts, OCR receipts, and savings goals, visit your PACE Dashboard.
        </p>
      </div>
      ${getEmailFooter()}
    </div>
  `;

  return sendMailHelper({
    to,
    subject,
    html,
    text: `PACE Financial Summary: Expenses: ${currency}${totalExpense}, Income: ${currency}${totalIncome}, Net: ${currency}${netSavings}, Top Category: ${topCategory}.`,
  });
}
