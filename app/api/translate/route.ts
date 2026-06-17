import { NextRequest, NextResponse } from 'next/server';

// Translate text via Google Translate. Uses the official API if a key is set,
// otherwise falls back to the free unofficial endpoint so the feature works
// in development/demo without billing setup.
export async function POST(req: NextRequest) {
  try {
    const { texts, target } = await req.json();
    if (!Array.isArray(texts) || !target) {
      return NextResponse.json({ error: 'texts[] and target required' }, { status: 400 });
    }
    if (target === 'en') {
      return NextResponse.json({ translations: texts });
    }

    const key = process.env.GOOGLE_TRANSLATE_API_KEY;

    if (key) {
      const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: texts, target, format: 'text' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Translate API error');
      return NextResponse.json({ translations: data.data.translations.map((t: any) => t.translatedText) });
    }

    // Free fallback (Google translate gtx endpoint) — batched one by one
    const translations = await Promise.all(
      texts.map(async (t: string) => {
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(t)}`;
          const r = await fetch(url);
          const j = await r.json();
          return j[0].map((seg: any) => seg[0]).join('');
        } catch { return t; }
      })
    );
    return NextResponse.json({ translations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
