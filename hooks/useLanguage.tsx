'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

// Comprehensive UI dictionary (instant, no API call).
const DICT: Record<string, Record<string, string>> = {
  ta: {
    'Welcome back,': 'மீண்டும் வரவேற்கிறோம்,',
    'My Fields': 'என் வயல்கள்',
    'See all': 'அனைத்தையும் காண',
    'All': 'அனைத்தும்',
    'Humidity': 'ஈரப்பதம்', 'Rain': 'மழை', 'Wind': 'காற்று',
    'Clear sky': 'தெளிவான வானம்', 'Locating…': 'இடம் கண்டறிகிறது…',
    'Regional Intelligence': 'பிராந்திய நுண்ணறிவு',
    'District-wide pest & disease early warning': 'மாவட்ட அளவில் பூச்சி & நோய் முன்னெச்சரிக்கை',
    'Healthy': 'ஆரோக்கியமானது', 'Watch': 'கண்காணிப்பு', 'Outbreak Risk': 'பரவல் அபாயம்',
    'Your Crop Regions': 'உங்கள் பயிர் பகுதிகள்',
    'Regions tracked': 'கண்காணிக்கப்படும் பகுதிகள்', 'Outbreak alerts': 'பரவல் எச்சரிக்கைகள்',
    'Fields declining': 'குறையும் வயல்கள்', 'declining now': 'இப்போது குறைகிறது',
    'nearby field': 'அருகிலுள்ள வயல்', 'nearby fields': 'அருகிலுள்ள வயல்கள்',
    'Send WhatsApp Alert': 'வாட்ஸ்அப் எச்சரிக்கை அனுப்பு',
    'Upgrade to Pro': 'புரோ-விற்கு மேம்படுத்து',
    'Unlimited farms, Tamil alerts, regional intelligence': 'வரம்பற்ற வயல்கள், தமிழ் எச்சரிக்கைகள், பிராந்திய நுண்ணறிவு',
    'Profile': 'சுயவிவரம்', 'Security': 'பாதுகாப்பு', 'Preferences': 'விருப்பங்கள்',
    'Notifications': 'அறிவிப்புகள்', 'Critical Alerts': 'முக்கிய எச்சரிக்கைகள்',
    'Weekly Report': 'வாராந்திர அறிக்கை', 'AI Recommendations': 'AI பரிந்துரைகள்',
    'Dark Mode': 'இருண்ட பயன்முறை', 'Language': 'மொழி', 'Sign Out': 'வெளியேறு',
    'Full Name': 'முழு பெயர்', 'Email': 'மின்னஞ்சல்', 'Phone': 'தொலைபேசி',
    'Save Changes': 'மாற்றங்களை சேமி', 'Update Password': 'கடவுச்சொல்லை புதுப்பி',
    'Save Preferences': 'விருப்பங்களை சேமி',
    'Satellite Map': 'செயற்கைக்கோள் வரைபடம்', 'Satellite': 'செயற்கைக்கோள்', 'Terrain': 'நிலப்பரப்பு',
    'My Farms': 'என் பண்ணைகள்', 'Search farms...': 'பண்ணைகளைத் தேடு...',
    'AI Reports': 'AI அறிக்கைகள்', 'Soil Health': 'மண் ஆரோக்கியம்', 'Fertility': 'வளம்',
    'Moisture': 'ஈரப்பதம்', 'Erosion Risk': 'அரிப்பு அபாயம்', 'WhatsApp Alerts': 'வாட்ஸ்அப் எச்சரிக்கைகள்',
    'Excellent': 'சிறந்தது', 'Good': 'நல்லது', 'Needs Care': 'கவனிப்பு தேவை', 'Critical': 'நெருக்கடி',
  },
  hi: {
    'Welcome back,': 'वापसी पर स्वागत है,',
    'My Fields': 'मेरे खेत', 'See all': 'सभी देखें', 'All': 'सभी',
    'Humidity': 'नमी', 'Rain': 'वर्षा', 'Wind': 'हवा',
    'Clear sky': 'साफ़ आसमान', 'Locating…': 'स्थान खोज रहे हैं…',
    'Regional Intelligence': 'क्षेत्रीय बुद्धिमत्ता',
    'District-wide pest & disease early warning': 'ज़िला-स्तरीय कीट और रोग पूर्व चेतावनी',
    'Healthy': 'स्वस्थ', 'Watch': 'निगरानी', 'Outbreak Risk': 'प्रकोप जोखिम',
    'Your Crop Regions': 'आपके फसल क्षेत्र',
    'Regions tracked': 'ट्रैक किए गए क्षेत्र', 'Outbreak alerts': 'प्रकोप अलर्ट',
    'Fields declining': 'गिरते खेत', 'declining now': 'अभी गिर रहा',
    'nearby field': 'पास का खेत', 'nearby fields': 'पास के खेत',
    'Send WhatsApp Alert': 'व्हाट्सएप अलर्ट भेजें',
    'Upgrade to Pro': 'प्रो में अपग्रेड करें',
    'Unlimited farms, Tamil alerts, regional intelligence': 'असीमित खेत, अलर्ट, क्षेत्रीय बुद्धिमत्ता',
    'Profile': 'प्रोफ़ाइल', 'Security': 'सुरक्षा', 'Preferences': 'प्राथमिकताएँ',
    'Notifications': 'सूचनाएं', 'Critical Alerts': 'गंभीर अलर्ट',
    'Weekly Report': 'साप्ताहिक रिपोर्ट', 'AI Recommendations': 'AI सिफ़ारिशें',
    'Dark Mode': 'डार्क मोड', 'Language': 'भाषा', 'Sign Out': 'साइन आउट',
    'Full Name': 'पूरा नाम', 'Email': 'ईमेल', 'Phone': 'फ़ोन',
    'Save Changes': 'परिवर्तन सहेजें', 'Update Password': 'पासवर्ड अपडेट करें',
    'Save Preferences': 'प्राथमिकताएँ सहेजें',
    'Satellite Map': 'सैटेलाइट मानचित्र', 'Satellite': 'सैटेलाइट', 'Terrain': 'भूभाग',
    'My Farms': 'मेरे खेत', 'Search farms...': 'खेत खोजें...',
    'AI Reports': 'AI रिपोर्ट', 'Soil Health': 'मिट्टी स्वास्थ्य', 'Fertility': 'उर्वरता',
    'Moisture': 'नमी', 'Erosion Risk': 'अपरदन जोखिम', 'WhatsApp Alerts': 'व्हाट्सएप अलर्ट',
    'Excellent': 'उत्कृष्ट', 'Good': 'अच्छा', 'Needs Care': 'देखभाल चाहिए', 'Critical': 'गंभीर',
  },
};

interface LangCtx {
  lang: string;
  setLang: (c: string) => void;
  t: (s: string) => string;
  translate: (texts: string[]) => Promise<string[]>;
}

const Ctx = createContext<LangCtx>({ lang: 'en', setLang: () => {}, t: (s) => s, translate: async (x) => x });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cognentrz-lang') : null;
    if (saved) setLangState(saved);
  }, []);

  const setLang = (c: string) => {
    setLangState(c);
    if (typeof window !== 'undefined') localStorage.setItem('cognentrz-lang', c);
  };

  const t = (s: string) => (lang === 'en' ? s : (DICT[lang]?.[s] ?? s));

  const translate = async (texts: string[]) => {
    if (lang === 'en') return texts;
    try {
      const res = await fetch('/api/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, target: lang }),
      });
      const data = await res.json();
      return data.translations || texts;
    } catch { return texts; }
  };

  return <Ctx.Provider value={{ lang, setLang, t, translate }}>{children}</Ctx.Provider>;
}

export function useLanguage() { return useContext(Ctx); }
