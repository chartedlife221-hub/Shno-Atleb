/* Hero extras: copy, drink layer colors, nav icons. */
/* ---------- extra copy for the new hero / nav ---------- */
Object.assign(T.ar,{heroH1:"شنو أطلب؟",navAria:"أقسام الصفحة",navMenu:"القائمة",navAreas:"المناطق",navSubmit:"شارك طلبك",navWait:"الانتظار",heroAria:"أبرز الطلبات",openItem:"اعرضه في القائمة"});
Object.assign(T.en,{heroH1:"What should I order?",navAria:"Page sections",navMenu:"Menu",navAreas:"Areas",navSubmit:"Submit",navWait:"Waitlist",heroAria:"Featured orders",openItem:"Show in the list"});

/* Drink / dessert layer colors (top → bottom) for the hero art */
const LAYERS = {
 "iced-vanilla-americano":["#EAD7B8","#6A4128","#3E2314","#2B170C"],
 "iced-coffee-3-scoops-white":["#F2E6D0","#DDC39C","#8B5E3C","#4A2A18"],
 "iced-spanish-latte":["#F4E7CF","#E1C69B","#B88A5A","#6B4529"],
 "iced-caramel-macchiato":["#F0DFC2","#C98B45","#E7D2AE","#5A3320"],
 "caramel-frappuccino":["#F6EAD3","#E0B97C","#C08C52","#9B6A38"],
 "caramel-cappuccino":["#F3E6CE","#D9A867","#9A6A3C","#6B4529"],
 "iced-pistachio-latte":["#E9F0C9","#BFD27F","#93B35C","#5F7F3A"],
 "iced-matcha-latte":["#6C9A3A","#F1EFE2","#F1EFE2","#9A9C3E"],
 "lotus-cheesecake":["#C47A3E","#F2E3C4","#F2E3C4","#B77A45"],
 "honey-cinnamon-latte":["#F1DFC0","#D9A24A","#B9722E","#7A4520"]
};
const DEFAULT_LAYERS = {
 iced_coffee:["#EAD7B8","#B88A5A","#6B4529","#3E2314"],
 hot_coffee:["#F3E6CE","#C99A62","#8A5A34","#4A2A18"],
 specialty_latte:["#F1DFC0","#D9A24A","#B9722E","#7A4520"],
 matcha_other:["#6C9A3A","#F1EFE2","#F1EFE2","#9A9C3E"],
 cake_dessert:["#C47A3E","#F2E3C4","#F2E3C4","#B77A45"]
};
const layersFor = it => LAYERS[it.id] || DEFAULT_LAYERS[it.cat];

const ICONS = {
 menu:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 areas:'<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
 submit:'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/>',
 waitlist:'<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4l2-2z"/><path d="M10 21h4"/>'
};
const NAV = [["menu","#menu","navMenu"],["areas","#areas","navAreas"],["submit","#submit","navSubmit"],["waitlist","#waitlist","navWait"]];
