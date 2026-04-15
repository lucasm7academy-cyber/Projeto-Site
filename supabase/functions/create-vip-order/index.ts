// @ts-ignore - Deno types not available in VSCode
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno types not available in VSCode
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, apikey",
};

interface CreateVipOrderRequest {
  userId: string;
}

interface MercadoPagoOrderResponse {
  id: number;
  qr_code: string;
  qr_code_base64?: string;
  [key: string]: any;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: CreateVipOrderRequest = await req.json();
    const { userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: userId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('[create-vip-order] Processing VIP subscription for user:', userId);

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;

    if (!supabaseServiceKey) {
      console.error('[create-vip-order] SERVICE_ROLE_KEY not configured');
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Mercado Pago credentials
    const mercadoPagoAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

    if (!mercadoPagoAccessToken) {
      console.error('[create-vip-order] MERCADO_PAGO_ACCESS_TOKEN not configured');
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Create order in Mercado Pago for VIP subscription
    console.log('[create-vip-order] Creating VIP order in Mercado Pago...');

    const orderPayload = {
      title: "M7 Academy VIP — 1 mês",
      description: "Assinatura VIP M7 Academy - Acesso a todos os benefícios exclusivos",
      notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
      payer: {
        email: `user-${userId}@m7academy.local`,
      },
      items: [
        {
          id: "vip_monthly",
          title: "M7 Academy VIP — 1 mês",
          quantity: 1,
          unit_price: 9.90,
        },
      ],
      metadata: {
        user_id: userId,
        tipo: "vip",
      },
    };

    const createOrderResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mercadoPagoAccessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!createOrderResponse.ok) {
      const errorText = await createOrderResponse.text();
      console.error('[create-vip-order] Mercado Pago error:', errorText);
      return new Response(JSON.stringify({ error: "Failed to create VIP order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderData: MercadoPagoOrderResponse = await createOrderResponse.json();
    const orderId = String(orderData.id);

    console.log('[create-vip-order] VIP order created successfully:', orderId);

    // Step 2: Get QR Code image from Mercado Pago
    let qrCodeBase64 = null;

    if (orderData.qr_code_base64) {
      qrCodeBase64 = orderData.qr_code_base64;
    } else if (orderData.qr_code) {
      qrCodeBase64 = orderData.qr_code;
    }

    // If we still don't have QR code, generate one using a QR code API
    if (!qrCodeBase64 && orderData.init_point) {
      console.log('[create-vip-order] Generating QR code from checkout URL...');
      const qrApiResponse = await fetch(
        `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(orderData.init_point)}`
      );
      if (qrApiResponse.ok) {
        const blob = await qrApiResponse.arrayBuffer();
        qrCodeBase64 = btoa(String.fromCharCode(...new Uint8Array(blob)));
        console.log('[create-vip-order] QR code generated from URL');
      }
    }

    console.log('[create-vip-order] QR Code obtained:', qrCodeBase64 ? 'yes' : 'no');

    // Step 3: Insert VIP payment record in Supabase
    const { error: insertError } = await supabase.from("pagamentos").insert({
      user_id: userId,
      cakto_order_id: orderId,
      produto_id: "vip_monthly",
      valor_brl: 9.90,
      mcs_creditados: 0,
      tipo: "vip",
      status: "pendente",
    });

    if (insertError) {
      console.error('[create-vip-order] Failed to insert payment record:', insertError);
      return new Response(JSON.stringify({ error: "Failed to save VIP order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('[create-vip-order] VIP payment record inserted successfully');

    // Return QR code and order info to frontend
    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        qrCode: qrCodeBase64,
        brCode: orderData.qr_code,
        paymentUrl: orderData.init_point,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('[create-vip-order] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
