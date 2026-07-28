/**
 * Email digest via Resend HTTP API (optional).
 * https://resend.com/docs/api-reference/emails/send-email
 */

export async function sendResendEmail({
  apiKey,
  from,
  to,
  subject,
  html,
  text,
  fetchImpl = fetch,
}) {
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  if (!from) {
    throw new Error("Missing DISCOVERY_FROM_EMAIL (verified Resend sender)");
  }
  if (!to) {
    throw new Error("Missing NOTIFY_EMAIL");
  }

  const recipients = String(to)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      html,
      text,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Resend ${response.status}: ${payload?.message || JSON.stringify(payload)}`,
    );
  }
  return payload;
}
