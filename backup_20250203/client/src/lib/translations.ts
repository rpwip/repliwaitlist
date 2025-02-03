export const translations = {
  en: {
    // Header
    title: "Cloud Cares",
    subtitle: "Modern Healthcare Queue Management",
    languageSelector: "Select your preferred language",

    // Registration Form
    fullName: "Full Name",
    fullNamePlaceholder: "Enter your full name",
    email: "Email",
    emailPlaceholder: "Enter your email",
    mobile: "Mobile Number",
    mobilePlaceholder: "Enter your mobile number",
    register: "Register",
    registering: "Registering...",

    // Payment
    paymentTitle: "Complete Payment",
    paymentDescription: "Scan the QR code using any UPI app",
    paymentAmount: "Amount to pay: ₹500.00",
    paymentInstructions: "Pay using any UPI app (GPay, PhonePe, Paytm, etc.)",
    paymentComplete: "I've completed the payment",
    confirmingPayment: "Confirming Payment...",
    transactionReference: "Transaction Reference",
    paymentSuccess: "Payment Successful!",
    appointmentConfirmed: "Your appointment has been confirmed",
    smsInstructions: "You will receive an SMS with your queue number and further instructions."
  },
  ta: {
    title: "க்ளவுட் கேர்ஸ்",
    subtitle: "நவீன சுகாதார வரிசை மேலாண்மை",
    languageSelector: "உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்",
    fullName: "முழு பெயர்",
    fullNamePlaceholder: "உங்கள் முழு பெயரை உள்ளிடவும்",
    email: "மின்னஞ்சல்",
    emailPlaceholder: "உங்கள் மின்னஞ்சலை உள்ளிடவும்",
    mobile: "கைபேசி எண்",
    mobilePlaceholder: "உங்கள் கைபேசி எண்ணை உள்ளிடவும்",
    register: "பதிவு செய்க",
    registering: "பதிவு செய்கிறது..."
  },
  hi: {
    title: "क्लाउड केयर्स",
    subtitle: "आधुनिक स्वास्थ्य सेवा कतार प्रबंधन",
    languageSelector: "अपनी पसंदीदा भाषा चुनें",
    fullName: "पूरा नाम",
    fullNamePlaceholder: "अपना पूरा नाम दर्ज करें",
    email: "ईमेल",
    emailPlaceholder: "अपना ईमेल दर्ज करें",
    mobile: "मोबाइल नंबर",
    mobilePlaceholder: "अपना मोबाइल नंबर दर्ज करें",
    register: "पंजीकरण करें",
    registering: "पंजीकरण हो रहा है..."
  }
};

export type Language = 'en' | 'ta' | 'hi';
export type TranslationKey = keyof typeof translations.en;

export function getTranslation(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || translations.en[key];
}