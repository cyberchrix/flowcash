import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    // Récupérer le token depuis les cookies ou les headers
    const cookieStore = await cookies();
    const authToken = cookieStore.get("sb-access-token")?.value || 
                      cookieStore.get("supabase-auth-token")?.value ||
                      request.headers.get("authorization")?.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: "Not authenticated", id: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", id: null },
      { status: 500 }
    );
  }
}

