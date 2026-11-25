export type Lang = "en" | "lud";

/**
 * Words that belong to the app itself (buttons, tab names, states). Everything a zair reads as
 * information comes from the database instead and is edited in admin.
 * Every Lisan ud-Dawat line here is listed in LISAN-REVIEW.md for proofreading.
 */
const S = {
  appName: ["Zaireen-e-Karbala", "زائرينِ كربلاء"],
  tabAaj: ["Aaj", "اْج"],
  tabZiyarat: ["Ziyarat", "زيارة"],
  tabMadad: ["Madad", "مدد"],
  tabMaloomat: ["Maloomat", "معلومات"],
  otherLang: ["لسان الدعوة", "English"],
  soon: ["Details coming soon", "تفصيل جلد اْوسے"],
  back: ["Back", "پاچها"],
  todayTimes: ["Today", "اْج نا وقت"],
  now: ["Now", "هوے"],
  next: ["Next", "اْگے"],
  menuToday: ["Today's menu", "اْج نو menu"],
  menuNone: ["Today's menu has not been added yet.", "اْج نو menu هجي نتهي اْيو."],
  menuImage: ["See the menu card", "Menu card ديكهو"],
  lunch: ["Lunch", "دوپهر نو جمن"],
  dinner: ["Dinner", "رات نو جمن"],
  majlisTonight: ["Tonight's majlis", "اْج رات ني مجلس"],
  booklet: ["Open the booklet", "Booklet كهولو"],
  announcements: ["Announcements", "اعلانات"],
  noAnnouncements: ["No announcements yet.", "هجي كوئي اعلان نتهي."],
  joinCommunity: ["Join the WhatsApp community", "WhatsApp community join كرو"],
  quick: ["Most asked", "گهنا پوچهے چهے"],
  secStay: ["Your stay", "تمارو قيام"],
  secZiyarat: ["Ziyarat", "زيارة"],
  secPlaces: ["Offices and places", "Offices انے جگھ"],
  secTravel: ["Travel", "سفر"],
  secMore: ["More", "مزيد"],
  openNow: ["Open now", "هوے كهلو چهے"],
  closedNow: ["Closed now", "هوے بند چهے"],
  opensAt: ["Opens at", "كهلسے"],
  hours: ["Hours", "وقت"],
  copy: ["Copy", "Copy"],
  copied: ["Copied", "Copy تهئي گيو"],
  call: ["Call", "Call كرو"],
  whatsapp: ["WhatsApp", "WhatsApp"],
  map: ["Open map", "Map كهولو"],
  signIn: ["Sign in", "Sign in كرو"],
  signInLead: ["Sign in to see your room and your ziyarat schedule.", "اپنو Room انے زيارة نو schedule ديكهوا واسطے sign in كرو."],
  signInSoon: ["Sign-in opens shortly. Timings, guidelines and office details are below.", "Sign in جلد شروع تهاسے. وقت، guidelines انے offices ني تفصيل نيچے چهے."],
  tourId: ["Tour ID", "Tour ID"],
  its: ["ITS number", "ITS نمبر"],
  notYou: ["Not you? Sign out", "تميں نتهي؟ Sign out كرو"],
  lostPerson: ["A person is lost?", "كوئي شخص گم تهئي گيا؟"],
  lostPersonDo: ["Tell Faiz reception at once, or any khidmat guzar.", "فوراً فيض نا Reception پر يا كوئي بهي خدمة گزار نے بتاؤ."],
  madadLead: ["Requests open here once sign-in is ready. Until then, these are the people to reach.", "Sign in شروع تهيا بعد requests يهاں سي تهئي سكسے. تب تك اْ لوگو نو رابطة كرو."],
  ziyaratLead: ["Your tour's ziyarat schedule appears here after you sign in.", "Sign in كيدا بعد تمارا tour نو زيارة schedule يهاں ديكهاسے."],
  ziyaratTypes: ["The four ziyarat", "چار زيارة"],
  assembly: ["Assembly point", "جمع تهاوا ني جگھ"],
  bus: ["Bus leaves", "Bus نكلسے"],
  offline: ["You are offline. Showing what was saved on this phone.", "Internet نتهي. اْ phone پر save تهيلو بتاوا ما اْوے چهے."],
  retry: ["Try again", "پهري كوشش كرو"],
  loadFail: ["This could not be loaded. Check your connection.", "اْ load نھ تهئي سكو. اپنو connection ديكهو."],
  close: ["Close", "بند كرو"],
  wifiSignIn: ["Sign in to see the Wi-Fi steps with your own details filled in.", "اپني تفصيل ساتهے Wi-Fi نا steps ديكهوا واسطے sign in كرو."],
} as const;

export type Key = keyof typeof S;
export const tr = (lang: Lang, key: Key): string => S[key][lang === "lud" ? 1 : 0];
export const STRINGS = S;
