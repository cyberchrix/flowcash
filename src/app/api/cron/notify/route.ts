import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { getDayOfMonth } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExpenseRow = {
  user_id: string;
  amount: number;
  currency: string;
};

type SubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

// Day of month for "tomorrow" in Europe/Paris (cron runs in UTC).
function tomorrowDayParis(): number {
  const now = new Date();
  const paris = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Paris" })
  );
  paris.setDate(paris.getDate() + 1);
  return paris.getDate();
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:noreply@availo.app";

  if (!url || !serviceKey || !vapidPublic || !vapidPrivate) {
    return NextResponse.json(
      { error: "Missing server configuration" },
      { status: 500 }
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const targetDay = tomorrowDayParis();

  // Active expenses due (by day of month) tomorrow, across all users.
  const { data: expenses, error: expensesError } = await admin
    .from("expenses")
    .select("user_id, amount, currency, expense_date, active");

  if (expensesError) {
    console.error("Cron: error loading expenses", expensesError);
    return NextResponse.json({ error: "Expenses error" }, { status: 500 });
  }

  const dueByUser = new Map<
    string,
    { total: number; count: number; currency: string }
  >();

  for (const e of (expenses ?? []) as (ExpenseRow & {
    expense_date: string;
    active: boolean | null;
  })[]) {
    if (e.active === false) continue;
    if (getDayOfMonth(e.expense_date) !== targetDay) continue;
    const entry = dueByUser.get(e.user_id) ?? {
      total: 0,
      count: 0,
      currency: e.currency || "EUR",
    };
    entry.total += Number(e.amount);
    entry.count += 1;
    dueByUser.set(e.user_id, entry);
  }

  const userIds = [...dueByUser.keys()];
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, targetDay, notified: 0 });
  }

  const { data: subs, error: subsError } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (subsError) {
    console.error("Cron: error loading subscriptions", subsError);
    return NextResponse.json({ error: "Subscriptions error" }, { status: 500 });
  }

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const sub of (subs ?? []) as SubscriptionRow[]) {
    const due = dueByUser.get(sub.user_id);
    if (!due) continue;

    const amount = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: due.currency,
      maximumFractionDigits: 0,
    }).format(due.total);

    const body =
      due.count > 1
        ? `Demain : ${due.count} charges pour un total de ${amount}.`
        : `Demain : une charge de ${amount}.`;

    const payload = JSON.stringify({
      title: "Availo · rappel de prélèvement",
      body,
      url: "/calendar",
      tag: "availo-charge-reminder",
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent += 1;
    } catch (err: unknown) {
      const statusCode =
        typeof err === "object" && err !== null && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;
      if (statusCode === 404 || statusCode === 410) {
        staleEndpoints.push(sub.endpoint);
      } else {
        console.error("Cron: push send error", err);
      }
    }
  }

  // Clean up expired/invalid subscriptions.
  if (staleEndpoints.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints);
  }

  return NextResponse.json({
    ok: true,
    targetDay,
    usersDue: userIds.length,
    sent,
    cleaned: staleEndpoints.length,
  });
}
