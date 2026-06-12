// supabase/functions/translate/index.ts
// Papago API CORS 우회용 Edge Function
// 배포: supabase functions deploy translate

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  const { text, source = 'en', target = 'ko' } = await req.json()

  const clientId = Deno.env.get('PAPAGO_CLIENT_ID')
  const clientSecret = Deno.env.get('PAPAGO_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'Papago credentials not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch('https://openapi.naver.com/v1/papago/n2mt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    body: new URLSearchParams({ source, target, text }),
  })

  const data = await res.json()
  const translatedText = data?.message?.result?.translatedText ?? ''

  return new Response(JSON.stringify({ translatedText }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
