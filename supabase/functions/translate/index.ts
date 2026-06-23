import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  const { text } = await req.json()

  const apiKey = Deno.env.get('DEEPL_KEY')

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'DEEPL_KEY not set' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }

  const response = await fetch(
    'https://api-free.deepl.com/v2/translate',
    {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: 'KO',
      }),
    }
  )

  const data = await response.json()
  const response = await fetch(
  'https://api-free.deepl.com/v2/translate',
  {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      target_lang: 'KO',
    }),
  }
)

const data = await response.json()

console.log("DEEPL STATUS:", response.status)
console.log("DEEPL DATA:", JSON.stringify(data))

  return new Response(
    JSON.stringify({
      translatedText: data.translations?.[0]?.text || '',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type',
      },
    }
  )
})