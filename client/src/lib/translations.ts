export const translations = {
  en: {
    // Header
    title: "Cloud Cares",
    subtitle: "Modern Healthcare Queue Management",
    
    // Registration Form
    fullName: "Full Name",
    fullNamePlaceholder: "Enter your full name",
    email: "Email",
    emailPlaceholder: "Enter your email",
    mobile: "Mobile Number",
    mobilePlaceholder: "Enter your mobile number",
    register: "Register",
    registering: "Registering...",
    
    // About Section
    aboutTitle: "About Cloud Cares",
    aboutDescription: "Cloud Cares is a modern medical facility dedicated to providing efficient and comfortable healthcare services. Our queue management system ensures minimal waiting times and a streamlined patient experience.",
    
    // Services Section
    servicesTitle: "Our Services",
    services: [
      "General consultation",
      "Digital queue management",
      "SMS notifications",
      "Online registration",
      "Secure payment processing"
    ],
    
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
    // Header
    title: "க்ளவுட் கேர்ஸ்",
    subtitle: "நவீன சுகாதார வரிசை மேலாண்மை",
    
    // Registration Form
    fullName: "முழு பெயர்",
    fullNamePlaceholder: "உங்கள் முழு பெயரை உள்ளிடவும்",
    email: "மின்னஞ்சல்",
    emailPlaceholder: "உங்கள் மின்னஞ்சலை உள்ளிடவும்",
    mobile: "கைபேசி எண்",
    mobilePlaceholder: "உங்கள் கைபேசி எண்ணை உள்ளிடவும்",
    register: "பதிவு செய்க",
    registering: "பதிவு செய்கிறது...",
    
    // About Section
    aboutTitle: "க்ளவுட் கேர்ஸ் பற்றி",
    aboutDescription: "க்ளவுட் கேர்ஸ் என்பது திறமையான மற்றும் வசதியான சுகாதார சேவைகளை வழங்குவதற்கு அர்ப்பணிக்கப்பட்ட நவீன மருத்துவ வசதி ஆகும். எங்கள் வரிசை மேலாண்மை அமைப்பு குறைந்தபட்ச காத்திருப்பு நேரங்களை உறுதி செய்கிறது.",
    
    // Services Section
    servicesTitle: "எங்கள் சேவைகள்",
    services: [
      "பொது ஆலோசனை",
      "டிஜிட்டல் வரிசை மேலாண்மை",
      "எஸ்எம்எஸ் அறிவிப்புகள்",
      "ஆன்லைன் பதிவு",
      "பாதுகாப்பான கட்டண செயலாக்கம்"
    ],
    
    // Payment
    paymentTitle: "கட்டணம் செலுத்துதல்",
    paymentDescription: "UPI பயன்பாட்டைப் பயன்படுத்தி QR குறியீட்டை ஸ்கேன் செய்யவும்",
    paymentAmount: "செலுத்த வேண்டிய தொகை: ₹500.00",
    paymentInstructions: "ஏதேனும் UPI பயன்பாட்டைப் பயன்படுத்தவும் (GPay, PhonePe, Paytm, etc.)",
    paymentComplete: "நான் கட்டணம் செலுத்தி விட்டேன்",
    confirmingPayment: "கட்டணம் உறுதி செய்கிறது...",
    transactionReference: "பரிவர்த்தனை குறிப்பு",
    paymentSuccess: "கட்டணம் வெற்றிகரமாக செலுத்தப்பட்டது!",
    appointmentConfirmed: "உங்கள் சந்திப்பு உறுதி செய்யப்பட்டது",
    smsInstructions: "உங்கள் வரிசை எண் மற்றும் மேலும் விவரங்களுடன் SMS பெறுவீர்கள்"
  }
};

export type Language = 'en' | 'ta';
export type TranslationKey = keyof typeof translations.en;

export function getTranslation(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || translations.en[key];
}
