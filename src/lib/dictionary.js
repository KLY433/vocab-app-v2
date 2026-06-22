export async function getWordInfo(word) {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    )

    if (!res.ok) return null

    const data = await res.json()

    return {
      meaning:
        data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition || '',
      example:
        data?.[0]?.meanings?.[0]?.definitions?.[0]?.example || ''
    }
  } catch (err) {
    console.error(err)
    return null
  }
}