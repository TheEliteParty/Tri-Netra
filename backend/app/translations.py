"""
Server-side translations for dynamic content (alerts, reports).
Used when the API receives a ?lang= parameter.
Falls back to English if translation not found.
"""

TRANSLATIONS = {
    "hi": {
        # Alert titles
        "CRITICAL - Immediate Landslide Threat": "गंभीर - तत्काल भूस्खलन खतरा",
        "High Landslide Risk Alert": "उच्च भूस्खलन जोखिम अलर्ट",
        "Moderate Landslide Warning": "मध्यम भूस्खलन चेतावनी",
        # Alert messages (static parts)
        "SIMULATION: CRITICAL landslide risk detected at": "सिमुलेशन: गंभीर भूस्खलन जोखिम का पता चला",
        "SIMULATION: HIGH landslide risk detected at": "सिमुलेशन: उच्च भूस्खलन जोखिम का पता चला",
        "SIMULATION: MODERATE landslide risk detected at": "सिमुलेशन: मध्यम भूस्खलन जोखिम का पता चला",
        "Rainfall": "वर्षा",
        "Soil Moisture": "मिट्टी की नमी",
        "Ground Displacement": "भूमि विस्थापन",
        "IMMEDIATE EVACUATION recommended": "तत्काल निकासी की सिफारिस",
        "Deploy emergency response teams": "आपातकालीन प्रतिक्रिया टीम तैनात करें",
        "Activate sirens and SMS alerts": "सायरन और SMS अलर्ट सक्रिय करें",
        "Close affected roads": "प्रभावित सड़कें बंद करें",
        "Expected event within hours": "घंटों में घटना अपेक्षित",
        # Report types
        "crack": "दरार",
        "slope_movement": "ढाल गति",
        "blocked_road": "अवरुद्ध सड़क",
        "flooding": "बाढ़",
        "other": "अन्य",
        # Report statuses
        "pending": "लंबित",
        "verified": "सत्यापित",
        "dismissed": "खारिज",
    },
    "bn": {
        "CRITICAL - Immediate Landslide Threat": "গুরুতর - তাৎক্ষণিক ভূমিধস় হুমকি",
        "High Landslide Risk Alert": "উচ্চ ভূমিধস় ঝুঁকি সতর্কতা",
        "Moderate Landslide Warning": "মাঝারি ভূমিধস় সতর্কতা",
        "SIMULATION: CRITICAL landslide risk detected at": "সিমুলেশন: গুরুতর ভূমিধস় ঝুঁকি সনাক্ত",
        "SIMULATION: HIGH landslide risk detected at": "সিমুলেশন: উচ্চ ভূমিধস় ঝুঁকি সনাক্ত",
        "SIMULATION: MODERATE landslide risk detected at": "সিমুলেশন: মাঝারি ভূমিধস় ঝুঁকি সনাক্ত",
        "Rainfall": "বৃষ্টিপাত",
        "Soil Moisture": "মাটির আর্দ্রতা",
        "Ground Displacement": "ভূমি স্থানান্তর",
        "IMMEDIATE EVACUATION recommended": "তাৎক্ষণিক নির্মোচনের সুপারিশ",
        "Deploy emergency response teams": "জরুরি প্রতিক্রিয়া দল মোতায়েন",
        "Activate sirens and SMS alerts": "সাইরেন এবং SMS সতর্কতা সক্রিয় করুন",
        "Close affected roads": "প্রভাবিত সড়ক বন্ধ করুন",
        "Expected event within hours": "ঘণ্টার মধ্যে ঘটনা প্রত্যাশিত",
        "crack": "ফাটল",
        "slope_movement": "ঢাল চলাচল",
        "blocked_road": "অবরুদ্ধ সড়ক",
        "flooding": "বন্যা",
        "other": "অন্যান্য",
        "pending": "বিচারাধীন",
        "verified": "যাচাইকৃত",
        "dismissed": "খারিজ",
    },
    "as": {
        "CRITICAL - Immediate Landslide Threat": "গুৰুতৰ - তাৎক্ষণিক ভূমিধস় হুমকী",
        "High Landslide Risk Alert": "উচ্চ ভূমিধস় বিপদ সতৰ্কতা",
        "Moderate Landslide Warning": "মাঝাৰি ভূমিধস় সতৰ্কতা",
        "SIMULATION: CRITICAL landslide risk detected at": "চিমুলেশন: গুৰুতৰ ভূমিধস় বিপদ চিনাক্ত",
        "SIMULATION: HIGH landslide risk detected at": "চিমুলেশন: উচ্চ ভূমিধস় বিপদ চিনাক্ত",
        "SIMULATION: MODERATE landslide risk detected at": "চিমুলেশন: মাঝাৰি ভূমিধস় বিপদ চিনাক্ত",
        "Rainfall": "বৃষ্টিপাত",
        "Soil Moisture": "মাটিৰ আৰ্দ্ৰতা",
        "Ground Displacement": "ভূমি স্থানান্তৰ",
        "IMMEDIATE EVACUATION recommended": "তাৎক্ষণিক নিৰ্মোচনৰ পৰামৰ্শ",
        "Deploy emergency response teams": "জৰুৰী প্ৰতিক্ৰিয়া দল মোতায়েন",
        "Activate sirens and SMS alerts": "চাইৰেন আৰু SMS সতৰ্কতা সক্ৰিয় কৰক",
        "Close affected roads": "প্ৰভাবিত ৰাস্তা বন্ধ কৰক",
        "Expected event within hours": "ঘণ্টাৰ ভিতৰত ঘটনা প্ৰত্যাশিত",
        "crack": "ফাটল",
        "slope_movement": "ঢাল চলাচল",
        "blocked_road": "অৱৰোধিত ৰাস্তা",
        "flooding": "বন্যা",
        "other": "অন্য",
        "pending": "বিচাৰাধীন",
        "verified": "যাচাইকৃত",
        "dismissed": "খাৰিজ",
    },
}


def translate_alert(title: str, message: str, lang: str = "en") -> tuple[str, str]:
    """Translate alert title and message to the target language.
    Returns (translated_title, translated_message).
    """
    if lang == "en" or lang not in TRANSLATIONS:
        return title, message

    t = TRANSLATIONS[lang]

    # Translate title — try exact match first, then partial
    translated_title = t.get(title, title)
    if translated_title == title:
        for en, hi in t.items():
            if en in title:
                translated_title = title.replace(en, hi)
                break

    # Translate message — replace known phrases
    translated_message = message
    for en, hi in t.items():
        translated_message = translated_message.replace(en, hi)

    return translated_title, translated_message


def translate_report_type(report_type: str, lang: str = "en") -> str:
    """Translate a report type enum value."""
    if lang == "en" or lang not in TRANSLATIONS:
        return report_type.replace("_", " ").title()
    return TRANSLATIONS[lang].get(report_type, report_type.replace("_", " ").title())


def translate_status(status: str, lang: str = "en") -> str:
    """Translate a status enum value."""
    if lang == "en" or lang not in TRANSLATIONS:
        return status.title()
    return TRANSLATIONS[lang].get(status, status.title())
