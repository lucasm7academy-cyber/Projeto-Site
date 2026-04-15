import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, apikey",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log('[mercado-pago-webhook] Received webhook');

    // Get query parameters from URL
    const url = new URL(req.url);
    const dataId = url.searchParams.get("data.id");
    const type = url.searchParams.get("type");

    // Validate webhook signature (only in production)
    const signature = req.headers.get("x-signature");
    const webhookSecret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") || "";

    // Only validate signature if we have both secret and production token (not TEST token)
    if (signature && webhookSecret && !accessToken.startsWith("TEST-")) {
      // Build query string for signature validation (Mercado Pago signs the query string)
      const queryString = url.search.substring(1); // Remove leading ?

      // Calculate HMAC-SHA256
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(queryString)
      );

      const calculatedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      console.log('[mercado-pago-webhook] Signature check:', { provided: signature, calculated: calculatedSignature });

      if (calculatedSignature !== signature) {
        console.error('[mercado-pago-webhook] Invalid signature - webhook rejected');
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log('[mercado-pago-webhook] Signature validated ✓');
    } else {
      // In test mode or without signature, just log and continue
      if (accessToken.startsWith("TEST-")) {
        console.log('[mercado-pago-webhook] Test mode detected - skipping signature validation');
      } else if (signature) {
        console.warn('[mercado-pago-webhook] Signature provided but MERCADO_PAGO_WEBHOOK_SECRET not configured');
      } else {
        console.log('[mercado-pago-webhook] No signature provided in webhook');
      }
    }

    console.log('[mercado-pago-webhook] Data ID:', dataId, 'Type:', type);

    // Only process payment notifications
    if (type !== "payment") {
      console.log('[mercado-pago-webhook] Ignoring non-payment type:', type);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = dataId;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[mercado-pago-webhook] Processing payment notification for order:', orderId);

    console.log('[mercado-pago-webhook] Processing approved payment, order ID:', orderId);

    // Fetch the payment record to get user_id and MCs amount
    const { data: paymentRecord, error: fetchError } = await supabase
      .from("pagamentos")
      .select("*")
      .eq("cakto_order_id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error('[mercado-pago-webhook] Error fetching payment record:', fetchError);
      return new Response(JSON.stringify({ error: "Payment record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!paymentRecord) {
      console.warn('[mercado-pago-webhook] No payment record found for order:', orderId);
      return new Response(JSON.stringify({ error: "Payment record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = paymentRecord.user_id;
    const mcs = paymentRecord.mcs_creditados;

    console.log('[mercado-pago-webhook] Crediting MCs:', { user: userId, mcs });

    // Fetch current balance
    const { data: currentBalance, error: balanceFetchError } = await supabase
      .from("saldos")
      .select("saldo")
      .eq("user_id", userId)
      .maybeSingle();

    if (balanceFetchError && balanceFetchError.code !== "PGRST116") {
      console.error('[mercado-pago-webhook] Error fetching current balance:', balanceFetchError);
      throw balanceFetchError;
    }

    // Update or create balance
    if (!currentBalance) {
      // Create new balance record
      const { error: insertError } = await supabase.from("saldos").insert({
        user_id: userId,
        saldo: mcs,
      });

      if (insertError) {
        console.error('[mercado-pago-webhook] Error creating balance:', insertError);
        throw insertError;
      }

      console.log('[mercado-pago-webhook] New balance created:', { user: userId, saldo: mcs });
    } else {
      // Update existing balance
      const newBalance = (currentBalance.saldo || 0) + mcs;
      const { error: updateError } = await supabase
        .from("saldos")
        .update({ saldo: newBalance })
        .eq("user_id", userId);

      if (updateError) {
        console.error('[mercado-pago-webhook] Error updating balance:', updateError);
        throw updateError;
      }

      console.log('[mercado-pago-webhook] Balance updated:', { user: userId, newSaldo: newBalance });
    }

    // Update payment status to approved
    const { error: updatePaymentError } = await supabase
      .from("pagamentos")
      .update({ status: "aprovado" })
      .eq("cakto_order_id", orderId);

    if (updatePaymentError) {
      console.error('[mercado-pago-webhook] Error updating payment status:', updatePaymentError);
      throw updatePaymentError;
    }

    console.log('[mercado-pago-webhook] Payment status updated to approved');

    return new Response(JSON.stringify({ success: true, message: "Payment processed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('[mercado-pago-webhook] Error processing webhook:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
