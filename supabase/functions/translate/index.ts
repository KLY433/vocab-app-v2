import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  try {
    const { text } = await req.json()

    const DEEPL_KEY = Deno.env.get("DEEPL_KEY")

    if (!DEEPL_KEY) {
      return new Response(
        JSON.stringify({ error: "DEEPL_KEY not set" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const endpoint = DEEPL_KEY.endsWith(":fx")
      ? "https://api-free.deepl.com/v2/translate"
      : "https://api.deepl.com/v2/translate"

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `DeepL-Auth-Key ${DEEPL_KEY}`,
      },
      body: JSON.stringify({
        text: [text],
        target_lang: "KO",
      }),
    })

    const data = await res.json()

    const translatedText = data?.translations?.[0]?.text ?? ""

    return new Response(
      JSON.stringify({ translatedText }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500 }
    )
  }
})