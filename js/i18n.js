/* Constants and bilingual (AR/EN) copy. */
const AREAS = ["Salmiya","Kuwait City","Jabriya","Hawally","Salwa","Fintas","Ahmadi","Farwaniya"];
const AREA_AR = {"Salmiya":"السالمية","Kuwait City":"مدينة الكويت","Jabriya":"الجابرية","Hawally":"حولي","Salwa":"سلوى","Fintas":"الفنطاس","Ahmadi":"الأحمدي","Farwaniya":"الفروانية"};
const CATS = ["iced_coffee","hot_coffee","specialty_latte","matcha_other","cake_dessert"];
const GRADIENTS = {
  iced_coffee:"linear-gradient(135deg,#E9C9A0,#B5532F)",
  hot_coffee:"linear-gradient(135deg,#D9B38C,#6B3F26)",
  specialty_latte:"linear-gradient(135deg,#F0D6B8,#C98A5B)",
  matcha_other:"linear-gradient(135deg,#D3E2BB,#6F8F52)",
  cake_dessert:"linear-gradient(135deg,#F3D3C4,#C46A5A)"
};
const STALE_DAYS = 60;

const T = {
 ar:{
  banner:"نسخة تجريبية — البيانات مؤقتة (placeholder) وبانتظار التحقق.",
  heroSub:"أكثر طلبات القهوة مبيعاً في الكويت، في مكان واحد.",
  tagline:"الطلب الصح اللي تطلبه في الكويت.",
  searchLabel:"ابحث", searchPh:"ابحث عن طلب أو كافيه…", searchBtn:"بحث",
  topTitle:"أفضل ١٠ هالأسبوع", topSub:"الأكثر طلباً حسب مصادر المجتمع.",
  allTitle:"كل الطلبات", allSub:"اختر الفئة وفلتر حسب المنطقة والسعر.",
  cat_all:"الكل", cat_iced_coffee:"مثلج", cat_hot_coffee:"حار", cat_specialty_latte:"سبيشل", cat_matcha_other:"ماتشا وغيره", cat_cake_dessert:"كيك وحلى",
  fArea:"المنطقة", fCafe:"الكافيه", fPrice:"السعر", fType:"نوع الطلب",
  all:"الكل",
  price_low:"أقل من 1.500 د.ك", price_mid:"1.500 – 2.000 د.ك", price_high:"أكثر من 2.000 د.ك",
  type_coffee:"قهوة", type_other:"ماتشا وغيره", type_dessert:"حلى",
  count:n=>n===1?"طلب واحد":`${n} طلب`,
  reset:"مسح الفلاتر",
  empty:"ما لقينا طلب بهالمواصفات. جرب تغيّر الفلاتر.",
  areaTitle:"تصفّح حسب المنطقة", areaItems:n=>`${n} طلب`,
  submitTitle:"عندك طلب مفضل؟",
  submitSub:"شاركنا الطلب بالضبط (الاسم، الكافيه، المنطقة) ونراجعه قبل النشر.",
  sCafe:"الكافيه", sOrder:"اسم الطلب بالضبط", sPrice:"السعر (د.ك)", sWhy:"ليش هو الأفضل؟ (اختياري)", sBtn:"أرسل الطلب",
  sOk:"وصلنا. شكراً! بنراجعه قبل ما ننشره. (تجربة فقط، ما انحفظ شي)", sAgain:"أرسل طلب ثاني",
  corrFor:"تصحيح لـ:",
  waitTitle:"كن أول من يضيف مراجعات وصور",
  waitSub:"نشتغل على المراجعات والصور المراجَعة وتطبيق الجوال. سجّل وبنخبرك.",
  wLabel:"إيميلك أو رقم الواتساب", wPh:"name@email.com أو 5xxxxxxx", wBtn:"سجّلني",
  wOk:"تم التسجيل. بنتواصل معك. (تجربة فقط، ما انحفظ شي)",
  disclaimer:"المعلومات مجمّعة من المجتمع وليست ادعاءات رسمية من العلامات التجارية. لا توجد شراكة أو رعاية من أي كافيه. الأسعار والتوفر قد تتغير.",
  footCorr:"أرسل تصحيحاً",
  mapLink:"الخريطة", corrLink:"أرسل تصحيحاً", verified:"آخر تحقق:", source:"المصدر:", recheck:"يحتاج إعادة تحقق", kd:"د.ك",
  badge_most_ordered:"الأكثر طلباً", badge_staff_pick:"اختيار الفريق", badge_cult_favorite:"مفضل المحبين", badge_local_favorite:"مفضل محلي",
  src_staff:"مقابلة مع الموظفين", src_delivery:"ترتيب تطبيق توصيل", src_community:"مشاركة من المجتمع",
  langBtn:"EN", langAria:"Switch to English", searchAria:"بحث"
 },
 en:{
  banner:"Prototype — data is placeholder, pending verification.",
  heroSub:"Kuwait's best-selling coffee orders, in one place.",
  tagline:"The exact order to get in Kuwait.",
  searchLabel:"Search", searchPh:"Search an order or café…", searchBtn:"Search",
  topTitle:"Top 10 this week", topSub:"Most-ordered picks, based on community sources.",
  allTitle:"All orders", allSub:"Pick a category, then filter by area and price.",
  cat_all:"All", cat_iced_coffee:"Iced", cat_hot_coffee:"Hot", cat_specialty_latte:"Specialty", cat_matcha_other:"Matcha & more", cat_cake_dessert:"Cake & dessert",
  fArea:"Area", fCafe:"Café", fPrice:"Price", fType:"Drink type",
  all:"All",
  price_low:"Under 1.500 KD", price_mid:"1.500 – 2.000 KD", price_high:"Over 2.000 KD",
  type_coffee:"Coffee", type_other:"Matcha & other", type_dessert:"Dessert",
  count:n=>n===1?"1 order":`${n} orders`,
  reset:"Clear filters",
  empty:"No orders match those filters. Try changing them.",
  areaTitle:"Browse by area", areaItems:n=>n===1?"1 order":`${n} orders`,
  submitTitle:"Got a favorite order?",
  submitSub:"Tell us the exact order (name, café, area). We review before publishing.",
  sCafe:"Café", sOrder:"Exact order name", sPrice:"Price (KD)", sWhy:"Why is it the one? (optional)", sBtn:"Submit best seller",
  sOk:"Got it, thank you! We'll review it before it goes live. (Demo only — nothing was saved.)", sAgain:"Submit another",
  corrFor:"Correction for:",
  waitTitle:"Be first to add reviews & photos",
  waitSub:"We're building moderated reviews, photos and a mobile app. Join the list and we'll tell you.",
  wLabel:"Your email or WhatsApp number", wPh:"name@email.com or 5xxxxxxx", wBtn:"Join the waitlist",
  wOk:"You're on the list. We'll be in touch. (Demo only — nothing was saved.)",
  disclaimer:"Items are community-sourced and are not official brand claims. No partnership with or endorsement by any café. Prices and availability may change.",
  footCorr:"Submit a correction",
  mapLink:"Map", corrLink:"Submit a correction", verified:"Last verified:", source:"Source:", recheck:"Needs recheck", kd:"KD",
  badge_most_ordered:"Most-ordered", badge_staff_pick:"Staff pick", badge_cult_favorite:"Cult favorite", badge_local_favorite:"Local favorite",
  src_staff:"Staff interview", src_delivery:"Delivery-app ranking", src_community:"Community submission",
  langBtn:"عربي", langAria:"التبديل إلى العربية", searchAria:"Search"
 }
};
const SRC_KEY = {"staff interview":"src_staff","delivery app ranking":"src_delivery","community submission":"src_community"};
