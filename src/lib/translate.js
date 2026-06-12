/**
 * translate.js
 * DeepL 또는 Papago API를 사용하여 영어 → 한국어 번역
 *
 * DeepL Free API:  https://api-free.deepl.com  (월 500,000자 무료)
 * Papago:          CORS 이슈로 인해 백엔드(Supabase Edge Function) 필요
 *
 * 권장: DeepL Free 티어 사용
 */

const DEEPL_KEY = import.meta.env.VITE_DEEPL_API_KEY

/**
 * DeepL API를 이용한 번역
 * @param {string} text  번역할 영어 원문
 * @returns {Promise<string>}  한국어 번역문
 */
export async function translateWithDeepL(text) {
  if (!DEEPL_KEY) throw new Error('VITE_DEEPL_API_KEY is not set')

  // DeepL Free 키는 ':fx' suffix 포함
  const endpoint = DEEPL_KEY.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `DeepL-Auth-Key ${DEEPL_KEY}`,
    },
    body: JSON.stringify({
      text: [text],
      source_lang: 'EN',
      target_lang: 'KO',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepL error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.translations[0].text
}

/**
 * Supabase Edge Function을 통한 Papago 번역 (CORS 우회)
 * Edge Function 코드는 /supabase/functions/translate/index.ts 참고
 */
export async function translateWithPapago(text) {
  const { supabase } = await import('../supabase/client')
  const { data, error } = await supabase.functions.invoke('translate', {
    body: { text, source: 'en', target: 'ko' },
  })
  if (error) throw error
  return data.translatedText
}

/**
 * 기본 번역 함수 — DeepL 우선, 없으면 Papago
 */
export async function translateText(text) {
  if (DEEPL_KEY) {
    return translateWithDeepL(text)
  }
  return translateWithPapago(text)
}
