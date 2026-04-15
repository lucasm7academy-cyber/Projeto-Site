import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, apikey",
};

interface CreateOrderRequest {
  userId: string;
  productId: string;
  amount: number;
  mcs: number;
}

interface MercadoPagoOrderResponse {
  id: number;
  qr_code: string;
  qr_code_base64?: string;
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: CreateOrderRequest = await req.json();
    const { userId, productId, amount, mcs } = body;

    if (!userId || !productId || !amount || !mcs) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, productId, amount, mcs" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('[create-mercado-pago-order] Processing order for user:', userId);

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;

    if (!supabaseServiceKey) {
      console.error('[create-mercado-pago-order] SERVICE_ROLE_KEY not configured');
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Mercado Pago credentials
    const mercadoPagoAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

    if (!mercadoPagoAccessToken) {
      console.error('[create-mercado-pago-order] MERCADO_PAGO_ACCESS_TOKEN not configured');
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Create order in Mercado Pago
    console.log('[create-mercado-pago-order] Creating order in Mercado Pago...', { amount, mcs });

    const orderPayload = {
      title: `M7 Academy - ${mcs} MCs`,
      description: `Compra de ${mcs} M7 Coins`,
      notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
      payer: {
        email: `user-${userId}@m7academy.local`, // Placeholder email
      },
      items: [
        {
          id: productId,
          title: `${mcs} MCs`,
          quantity: 1,
          unit_price: amount,
        },
      ],
      metadata: {
        user_id: userId,
        mcs: mcs,
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
      console.error('[create-mercado-pago-order] Mercado Pago error:', errorText);
      return new Response(JSON.stringify({ error: "Failed to create payment order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderData: MercadoPagoOrderResponse = await createOrderResponse.json();
    const orderId = String(orderData.id);

    console.log('[create-mercado-pago-order] Order created successfully:', orderId);
    console.log('[create-mercado-pago-order] Order data keys:', Object.keys(orderData));

    // Step 2: Get QR Code image from Mercado Pago
    // Try to get the QR code - it might be in different formats
    let qrCodeBase64 = null;

    if (orderData.qr_code_base64) {
      qrCodeBase64 = orderData.qr_code_base64;
    } else if (orderData.qr_code) {
      // If it's a URL or raw code, we'll use it
      qrCodeBase64 = orderData.qr_code;
    }

    // If we still don't have QR code, generate one using a QR code API
    if (!qrCodeBase64 && orderData.init_point) {
      console.log('[create-mercado-pago-order] Generating QR code from checkout URL...');
      // Use a free QR code API to generate from the checkout URL
      const qrApiResponse = await fetch(
        `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(orderData.init_point)}`
      );
      if (qrApiResponse.ok) {
        const blob = await qrApiResponse.arrayBuffer();
        qrCodeBase64 = btoa(String.fromCharCode(...new Uint8Array(blob)));
        console.log('[create-mercado-pago-order] QR code generated from URL');
      }
    }

    console.log('[create-mercado-pago-order] QR Code obtained:', qrCodeBase64 ? 'yes' : 'no');

    // Step 3: Insert payment record in Supabase
    const { error: insertError } = await supabase.from("pagamentos").insert({
      user_id: userId,
      cakto_order_id: orderId, // Using same column name for compatibility
      produto_id: productId,
      valor_brl: amount,
      mcs_creditados: mcs,
      status: "pendente",
    });

    if (insertError) {
      console.error('[create-mercado-pago-order] Failed to insert payment record:', insertError);
      return new Response(JSON.stringify({ error: "Failed to save payment record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('[create-mercado-pago-order] Payment record inserted successfully');

    // Return QR code and order info to frontend
    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        qrCode: qrCodeBase64,
        brCode: orderData.qr_code, // PIX copia e cola
        paymentUrl: orderData.init_point, // Link to Mercado Pago checkout (fallback)
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('[create-mercado-pago-order] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
