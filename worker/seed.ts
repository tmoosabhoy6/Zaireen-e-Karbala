/**
 * First content of the app: only what the brief and the content-source slides confirm.
 * Rows are inserted once and never overwritten, so admin edits always win (see ensureSeed).
 * Raise SEED_REV when adding rows.
 *
 * - `missing: true` marks a fact a department still has to supply. Zaereen see "details coming
 *   soon"; admin lists it under "Still missing".
 * - Lisan ud-Dawat text starts unapproved (awaiting proofread) and is shown only after approval.
 * - No credentials and no personal data here: the Wi-Fi password is entered in admin, not in code.
 */
export const SEED_REV = 1;

type Loc = Record<string, string>;
export interface SeedItem {
  id: string;
  kind: "page" | "block" | "office" | "fact" | "faq" | "request_type" | "feedback_q";
  grp?: string;
  sort?: number;
  icon?: string;
  en?: Loc;
  lud?: Loc;
  data?: Record<string, unknown>;
  missing?: boolean;
  audience?: "public" | "zair";
  enabled?: boolean;
}

const items: SeedItem[] = [];
const page = (id: string, section: string, icon: string, en: string, lud: string, extra: Partial<SeedItem> = {}) =>
  items.push({ id: `page.${id}`, kind: "page", grp: section, icon, en: { title: en }, lud: { title: lud }, ...extra });
let seq = 0;
const block = (pageId: string, type: string, en: Loc, lud: Loc = {}, data: Record<string, unknown> = {}, extra: Partial<SeedItem> = {}) =>
  items.push({ id: `b.${pageId}.${String(++seq).padStart(3, "0")}`, kind: "block", grp: `page.${pageId}`, en, lud, data: { type, ...data }, ...extra });
const fact = (id: string, grp: string, en: Loc, lud: Loc = {}, data: Record<string, unknown> = {}, extra: Partial<SeedItem> = {}) =>
  items.push({ id: `fact.${id}`, kind: "fact", grp, en, lud, data, ...extra });
const office = (id: string, en: Loc, lud: Loc, data: Record<string, unknown> = {}) =>
  items.push({ id: `office.${id}`, kind: "office", grp: "offices", icon: "building", en, lud, data });
/** A fact a department still has to supply. */
const todo = (id: string, grp: string, label: string, ludLabel = "", data: Record<string, unknown> = {}, extra: Partial<SeedItem> = {}) =>
  fact(id, grp, { label, value: "" }, ludLabel ? { label: ludLabel, value: "" } : {}, data, { missing: true, ...extra });

// ---------------------------------------------------------------------------
// Facts used across the app
// ---------------------------------------------------------------------------

fact("namaz.fajr", "namaz", { label: "Fajr ni namaz", value: "6:15 am" }, { label: "فجر ني نماز", value: "6:15 am" });
fact("namaz.zohr", "namaz", { label: "Zohr Asr ni namaz", value: "12:15 pm" }, { label: "ظهر عصر ني نماز", value: "12:15 pm" });
fact("namaz.maghrib", "namaz", { label: "Maghrib Isha ni namaz", value: "As per ITS" }, { label: "مغرب عشاء ني نماز", value: "ITS مطابق" }, { after: "19:00" });

fact("mawaid.nashta", "mawaid", { label: "Nashta (breakfast)", value: "7:00 to 8:30 am" }, { label: "ناشتا", value: "7:00 to 8:30 am" }, { meal: "breakfast" });
fact("mawaid.lunch", "mawaid", { label: "Dopahar nu jaman (lunch)", value: "12:30 to 2:00 pm" }, { label: "دوپهر نو جمن", value: "12:30 to 2:00 pm" }, { meal: "lunch" });
fact("mawaid.dinner", "mawaid", { label: "Raat nu jaman (dinner)", value: "7:15 to 8:30 pm" }, { label: "رات نو جمن", value: "7:15 to 8:30 pm" }, { meal: "dinner" });

fact("hours.default", "hours", { label: "Office hours when an office has none of its own", value: "11:00 am to 2:00 pm\n7:00 pm to 8:30 pm" });
fact("stay.checkin", "stay", { label: "Check-in", value: "Whenever you arrive" }, { label: "Check-in", value: "جيوارے بهي تميں پهونچو" });
fact("stay.checkout", "stay", { label: "Checkout", value: "8:00 am" }, { label: "Checkout", value: "8:00 am" });
fact("stay.notfaiz", "stay", { label: "Shown instead of a room", value: "You are not staying in Faiz accommodation." }, { label: "", value: "تميں فيض ني accommodation ما ٹهرا نتهي." });

// Assembly points for the ziyarat rules (shared/ziyarat.ts). data.v is the map link.
fact("place.najmi", "place", { label: "Najmi Masjid" }, { label: "نجمي مسجد" }, { v: "" });
fact("place.haram6", "place", { label: "Imam Husain AS Haram Mubarak, gate number 6" }, { label: "امام حسين ع م نا حرم مبارك، gate نمبر 6" }, { v: "" });
fact("place.emarah", "place", { label: "Al Imara hotel" }, { label: "Al Imara hotel" }, { v: "https://maps.app.goo.gl/fxuykj1jTrt75DKo8?g_st=aw" });
fact("place.kawthar", "place", { label: "Mujamma Kauthar" }, { label: "مجمع كوثر" }, { v: "https://maps.app.goo.gl/JuPPTTcWk14caH6HA?g_st=iw" });
fact("time.aftermaghrib", "place", { label: "Wording for a time that follows namaz", value: "Straight after Maghrib Isha ni namaz" }, { label: "", value: "مغرب عشاء ني نماز بعد فوراً" });

fact("community.url", "links", { label: "Karbala Zaireen WhatsApp community", value: "Timings and venues can change at short notice. Join the community to get updates." },
  { label: "كربلاء زائرين WhatsApp community", value: "وقت انے جگھ ما تبديلي تهئي سكے چهے. خبر واسطے community join كرو." },
  { type: "url", v: "https://chat.whatsapp.com/BJHysVHZV0JC77gM2RA841" });

// Wi-Fi: signed-in zaereen only. The password is typed in admin, never committed.
fact("wifi.ssid", "wifi", { label: "Network name", value: "KUNFAIZ" }, { label: "Network نو نام", value: "KUNFAIZ" }, {}, { audience: "zair" });
todo("wifi.password", "wifi", "Network password", "Network نو password", {}, { audience: "zair" });
fact("wifi.step1", "wifi", { label: "Step 1", value: "Join the Wi-Fi network using this name and password." }, { label: "Step 1", value: "اْ نام انے password سي Wi-Fi network join كرو." }, {}, { audience: "zair" });
fact("wifi.step2", "wifi", { label: "Step 2", value: "A login page opens. Enter your ITS number in the first field. In the second field enter your tour ID followed by 000." },
  { label: "Step 2", value: "ايك login page كهلسے. پظظلا خانه ما اپنو ITS نمبر لكهو. بيجا خانه ما اپني tour ID انے اهنا بعد 000 لكهو." }, {}, { audience: "zair" });
fact("wifi.note", "wifi", { label: "Note", value: "If you don't know your tour ID, ask your group leader or check your email." },
  { label: "Note", value: "اگر tour ID معلوم نھ هوئي تو اپنا group leader نے پوچهو يا اپنو email ديكهو." }, {}, { audience: "zair" });

// Contacts: names known from the brief, numbers still to come.
todo("phone.helpdesk", "contact", "WhatsApp help desk", "WhatsApp help desk", { type: "whatsapp" });
todo("phone.accommodation", "contact", "Accommodation mas'ool: Mulla Murtaza bhai Sheikh (Lester)", "Accommodation نا مسئول: ملا مرتضى بهائي شيخ (Lester)", { type: "phone" });
todo("phone.transport", "contact", "Transport mas'ool", "Transport نا مسئول", { type: "phone" });
todo("phone.housekeeping", "contact", "Housekeeping", "Housekeeping", { type: "phone" });
todo("phone.maintenance", "contact", "Maintenance", "Maintenance", { type: "phone" });
todo("phone.orientation", "contact", "Ziyarat orientation", "زيارة orientation", { type: "phone" });
todo("phone.accounts", "contact", "Accounts", "Accounts", { type: "phone" });
todo("phone.wheelchair", "contact", "Wheelchair office", "Wheelchair office", { type: "phone" });

// Not shown to zaereen; kept here so they appear under "Still missing".
todo("internal.bot-rules", "internal", "Rules for what the WhatsApp bot must never say", "", {}, { enabled: false });
todo("internal.feedback-questions", "internal", "The feedback questions", "", {}, { enabled: false });
todo("internal.maintenance-categories", "internal", "Common maintenance problems, and which are urgent", "", {}, { enabled: false });

// ---------------------------------------------------------------------------
// Offices. hours: one range per line. useDefault: follow fact.hours.default.
// ---------------------------------------------------------------------------

office("reception", { name: "Faiz main office reception", where: "Faiz main office", hours: "8:00 am to 2:30 pm\n5:00 pm to 8:30 pm" },
  { name: "فيض Main Office نو Reception", where: "فيض Main Office" });
office("accommodation", { name: "Accommodation office", where: "Faiz main office" }, { name: "Accommodation office", where: "فيض Main Office" }, { useDefault: true });
office("amil", { name: "Amil Saab's office", where: "Faiz main office", hours: "10:30 am to 1:30 pm\nAfter Maghrib namaz to 8:30 pm" },
  { name: "عامل صاحب ني office", where: "فيض Main Office", hours: "10:30 am to 1:30 pm\nمغرب ني نماز بعد سي 8:30 pm تك" });
office("accounts", { name: "Accounts office", where: "Faiz main office", hours: "12:00 pm to 1:30 pm\n7:00 pm to 8:30 pm", note: "Lawazimat is paid here." },
  { name: "Accounts office", where: "فيض Main Office", note: "لوازمات يهاں ادا تهائي چهے." }, { facts: ["fact.lawazimat.currencies"] });
office("orientation", { name: "Ziyarat orientation office", where: "Faiz main office", note: "This office approves schedule change requests." },
  { name: "زيارة orientation office", where: "فيض Main Office", note: "Schedule ما تبديلي ني request اْ office approve كرے چهے." }, { useDefault: true });
office("clinic", { name: "Mahal us Shifa clinic", where: "Faiz ground floor", hours: "7:30 to 9:30 am\n1:00 to 3:00 pm\n7:30 to 9:00 pm" },
  { name: "محل الشفاء clinic", where: "فيض نو ground floor" });
office("laundry", { name: "Laundry", where: "Faiz ground floor", hours: "3:00 to 5:00 pm" }, { name: "Laundry", where: "فيض نو ground floor" });
office("wheelchair", { name: "Wheelchair office", where: "Faiz ground floor" }, { name: "Wheelchair office", where: "فيض نو ground floor" }, { useDefault: true });
office("lost", { name: "Lost and Found office", where: "Faiz ground floor" }, { name: "Lost and Found office", where: "فيض نو ground floor" }, { useDefault: true });
office("mannat", { name: "Mannat Niyaz office", where: "Near Faiz Mawaid", hours: "Morning: 8:00 to 8:45 am\nAfternoon: 1:00 to 2:00 pm\nEvening: 7:30 to 8:30 pm" },
  { name: "منة-نياز office", where: "فيض – موائد نا نزديك" });
todo("lawazimat.currencies", "offices", "Accepted currencies for lawazimat", "لوازمات واسطے قبول تهاتي currencies");

// ---------------------------------------------------------------------------
// Pages (Maloomat). grp is the section; data.tile puts it on the Aaj quick tiles.
// ---------------------------------------------------------------------------

// --- Your stay
page("room", "stay", "bed", "Your room and arrival", "Room انے اْمد");
block("room", "facts", { title: "Timings" }, { title: "وقت" }, { refs: ["fact.stay.checkin", "fact.stay.checkout"] });
block("room", "text", { title: "Getting into your room", body: "- Buildings inside Faiz: walk in. Your room is unlocked.\n- Qasr building: collect your key at the Qasr building's reception desk." },
  { title: "Room ما كيم جاوو", body: "- فيض ني اندر ني هر building: سيدها اندر جاؤ، Room كهلو چهے.\n- Qasr building: Qasr building نا reception desk سي چابي لئي لو." });
block("room", "text", { title: "If your room is not ready when you arrive", body: "- Contact your group leader, or\n- message the WhatsApp help desk, or\n- contact the accommodation mas'ool, Mulla Murtaza bhai Sheikh (Lester)." },
  { title: "اگر پهونچتا وقت Room تيار نھ هوئي", body: "- اپنا group leader نو رابطة كرو، يا\n- WhatsApp help desk نے message كرو، يا\n- accommodation نا مسئول ملا مرتضى بهائي شيخ (Lester) نو رابطة كرو." });
block("room", "facts", {}, {}, { refs: ["fact.phone.helpdesk", "fact.phone.accommodation"] });
todo("housekeeping.schedule", "page.room", "How often rooms are cleaned, and when", "Room ني صفائي كيوارے تهائي چهے");

page("wifi", "stay", "wifi", "Wi-Fi", "Wi-Fi", { data: { tile: 1 } });
block("wifi", "wifi", {}, {});

page("izan", "stay", "id-card", "Izan cards", "اذن cards", { data: { tile: 2 } });
block("izan", "text", { body: "- Collect your jaman cards on the first day from the Reception in the Faiz Main Office.\n- Group leaders can collect the jaman Izan cards and hadaya for their group.\n- Every zair has their own individual card." },
  { body: "- جمن نا cards پظظلے دن فيض نا Main Office ما Reception سي حاصل كروو\n- Group leaders سي جمن نا اذن cards انے هدايا حاصل تهئي سكے چهے\n- هر زائر نا انفرادي (Individual) كاردز چهے" }, { source: "content-source/10-izan-cards.jpg" });
block("izan", "office", {}, {}, { ref: "office.reception" });

page("mawaid", "stay", "utensils", "Faiz Mawaid and namaz timings", "فيض موائد انے نماز نا وقت");
block("mawaid", "facts", { title: "Faiz Mawaid" }, { title: "فيض موائد" }, { refs: ["fact.mawaid.nashta", "fact.mawaid.lunch", "fact.mawaid.dinner"] });
block("mawaid", "menu", { title: "Today's menu" }, { title: "اْج نو menu" });
block("mawaid", "facts", { title: "Namaz" }, { title: "نماز" }, { refs: ["fact.namaz.fajr", "fact.namaz.zohr", "fact.namaz.maghrib"] });

page("laundry", "stay", "shirt", "Laundry", "Laundry");
block("laundry", "office", {}, {}, { ref: "office.laundry" });

// --- Ziyarat
page("libas", "ziyarat", "shirt", "Dress: Libas ul Anwar", "لباس الأنور");
block("libas", "text", { title: "Men", body: "Mumineen gents must wear kurta AND saya in both Harams and the Atabaat Aaliyah (Atraaf).\n!! Never kurta alone." },
  { title: "مردو", body: "مؤمنين بهائيو امام حسين ع م، مولانا عباس علمدار ع م انے العتبات العالية ني زيارة واسطے لباس الانور كرتا انے ساير ما} جائي\n!! فقط كرتا ما هرگز نھ جائي" },
  { source: "content-source/04-libas-ul-anwar-men.jpg" });
block("libas", "image", { caption: "Kurta alone is wrong. Kurta with saya is right." }, { caption: "فقط كرتا غلط چهے. كرتا انے ساير صحيح چهے." }, { src: "/img/kurta-saya.jpg", narrow: true });
block("libas", "text", { title: "Women", body: "Muminaat behno wear only the Ohbat rida, following the guidelines." },
  { title: "بيرو", body: "مؤمنات بهنو برابر لحاظ نو خيال راكهے، بال دهانكي نے، سادي رداء، مقنع انے موزه پهني نے} جائي، اْ امر ما گهنو زيادة خيال راكهے، يھ بابت ما كوتاهي نا سبب امور درپيش اْوے چهے،" },
  { source: "content-source/05-libas-ul-anwar-women.jpg" });
block("libas", "link", { title: "Ohbat Rida guidelines" }, { title: "اهبة رداء ني guidelines" }, { to: "page.ohbat" });

page("ohbat", "ziyarat", "sparkles", "Ohbat Rida guidelines", "اهبة رداء ني guidelines");
block("ohbat", "image", { caption: "Tap the picture to open it full screen and zoom." }, { caption: "Picture نے موٹو كروا واسطے اهنا پر tap كرو." }, { src: "/img/ohbat-rida-guidelines.jpg", zoom: true });
block("ohbat", "steps", { body: "A petticoat is mandatory with this rida.\nWear the pardi sleeve as shown.\nFasten the blouse cuff button.\nWear both maqno and ornu as shown.\nWear socks (not ankle socks)." },
  { body: "اْ رداء ساتهے petticoat پهنوو لازم چهے.\nپردي sleeve بتايا مطابق پهنوو.\nBlouse نا cuff نو button بند كروو.\nمقنع انے اورنو بيوے بتايا مطابق پهنوو.\nموزه پهنوو (ankle socks نهيں)." });

page("bring", "ziyarat", "luggage", "What to bring for ziyarat", "زيارة واسطے سوں لاوو");
block("bring", "text", { title: "Pehli Ziyarat", body: "!! Do not bring power banks, your passport, or any high-value items.\n- Men wear kurta and saya.\n- Women wear the Ohbat ni rida." },
  { title: "پظظلي زيارة", body: "!! Power bank، passport يا كوئي بهي قيمتي چيز ساتهے نھ لاؤ.\n- مردو كرتا انے ساير پهنے.\n- بيرو اهبة ني رداء پهنے." });
todo("bring.atraaf", "page.bring", "What to bring: Karbala Mualla Atraaf - Atabaat Aaliyah", "كربلاء معلى اطراف - العتبات العالية");
todo("bring.baghdad", "page.bring", "What to bring: Baghdad Atabaat Aaliyah", "بغداد العتبات العالية");
todo("bring.wada", "page.bring", "What to bring: Wada Ziyarat", "وداع زيارة");

page("conduct", "ziyarat", "hand-heart", "Kun Safar guidelines", "المعاملة");
block("conduct", "text", { title: "With the staff of the Haram Mubarak", body: "Cooperate with the staff of the Haram Mubarak of Imam Husain AS, the Haram Mubarak of Moulana Abbas Alamdar AS and the Atabaat Aaliyah.\n!! Do not argue with any Haram Mubarak staff. Rules and regulations must be followed at all locations." },
  { title: "منتسبين ساتهے", body: "امام حسين ع م نا حرم مبارك ما، مولانا عباس علمدار ع م نا حرم مبارك ما، انے العتبات العالية ما منتسبين ساتهے معاونة كروو لازم چهے،\n!! يھ سگلا نا ساته كوئي قسم سي بحث يا جهگڑو نئي كروو" },
  { source: "content-source/07-muamala-haram-staff.jpg" });
block("conduct", "text", { title: "Religious arguments", body: "!! Avoid all arguments on religious matters with anyone, in any manner, during ziyarat or otherwise." },
  { title: "ديني امور ما بحث", body: "عوام الناس نا ساتهے كوئي بهي شاكلة سي بحث مباحثة نھ كرے،\n!! انے خاصةً ديني امور ما على كل حال بحث نھ كرے، اْ امر ما گهنو زيادة خيال راكهوو لازم چهے" },
  { source: "content-source/08-muamala-religious-arguments.jpg" });

page("majalis", "ziyarat", "book-open", "Majalis", "مجالس");
block("majalis", "text", { body: "- Thursday and Friday nights: Najmi Masjid, straight after Maghrib Isha ni namaz.\n- Every other night: Imam Husain AS Haram Mubarak, gate number 6, at 9:30 pm.\nA majlis appears on the Aaj page on the day it is confirmed." },
  { body: "- جمعرات انے جمعة ني رات: نجمي مسجد، مغرب عشاء ني نماز بعد فوراً.\n- بيجي هر رات: امام حسين ع م نا حرم مبارك، gate نمبر 6، 9:30 pm.\nجھ دن مجلس نكي تهائي يھ دن اْج نا page پر بتاوا ما اْوسے." });

// --- Offices and places
page("offices", "places", "building", "Offices and timings", "Offices انے وقت");
block("offices", "offices", {}, {});

page("clinic", "places", "heart-pulse", "Clinic: Mahal us Shifa", "محل الشفاء clinic", { data: { tile: 4 } });
block("clinic", "office", {}, {}, { ref: "office.clinic" });

page("wheelchair", "places", "accessibility", "Wheelchairs", "Wheelchair", { data: { tile: 3 } });
block("wheelchair", "text", { body: "Wheelchairs are given from the wheelchair office on the Faiz ground floor." }, { body: "Wheelchair فيض نا ground floor پر wheelchair office سي ملے چهے." });
block("wheelchair", "office", {}, {}, { ref: "office.wheelchair" });
block("wheelchair", "facts", {}, {}, { refs: ["fact.phone.wheelchair"] });

page("lost", "places", "search", "Lost and Found", "Lost and Found");
block("lost", "warn", { title: "A person is lost", body: "Report it at Faiz reception immediately, or tell any khidmat guzar you can find." },
  { title: "كوئي شخص گم تهئي جائي", body: "فوراً فيض نا Reception پر خبر كرو، يا جھ بهي خدمة گزار ملے اهنے بتاؤ." });
block("lost", "text", { title: "A lost item", body: "Go to the Lost and Found office on the Faiz ground floor, or ask at Faiz reception." },
  { title: "كوئي چيز گم تهئي جائي", body: "فيض نا ground floor پر Lost and Found office ما جاؤ، يا فيض نا Reception پر پوچهو." });
block("lost", "office", {}, {}, { ref: "office.lost" });
block("lost", "office", {}, {}, { ref: "office.reception" });

page("mannat", "places", "hand-heart", "Mannat Niyaz office", "منة-نياز");
block("mannat", "office", {}, {}, { ref: "office.mannat", source: "content-source/02-mannat-niyaz-office.jpg" });

page("currency", "places", "banknote", "Currency exchange", "Currency exchange");
block("currency", "text", { title: "Accepted currencies", body: "USD, INR, KD, PKR, AED and other currencies.\nBig denominations are better." },
  { title: "قبول تهاتي currencies", body: "USD، INR، KD، PKR، AED انے بيجي currencies.\nموٹي notes بهتر چهے." }, { source: "content-source/03-currency-exchange-guide.jpg" });
block("currency", "text", { title: "Where", body: "Shops and carts near Faiz." }, { title: "كهاں", body: "فيض نا نزديك ني دكانو انے carts." });

// --- Travel
page("arrival", "travel", "bus", "Arriving in Karbala", "كربلاء ما اْمد");
block("arrival", "text", { body: "Zaereen reach Karbala three ways:\n- by road from Kuwait through the Safwan border\n- from Baghdad airport\n- from Najaf" },
  { body: "زائرين كربلاء تين طريقة سي پهونچے چهے:\n- Kuwait سي road سي، Safwan border تهئي نے\n- Baghdad airport سي\n- نجف سي" });
todo("arrival.kuwait", "page.arrival", "Arrival steps: by road from Kuwait through the Safwan border", "Kuwait سي road سي اْمد");
todo("arrival.baghdad", "page.arrival", "Arrival steps: from Baghdad airport", "Baghdad airport سي اْمد");
todo("arrival.najaf", "page.arrival", "Arrival steps: from Najaf", "نجف سي اْمد");

page("departure", "travel", "plane", "Leaving Karbala", "كربلاء سي روانگي");
block("departure", "text", { title: "When you leave Karbala", body: "- Baghdad airport flight: 6 hours before the flight time.\n- Najaf airport flight: 4 hours before the flight time.\n- Transfer to Najaf: 8:00 am on the day." },
  { title: "كربلاء سي كيوارے نكلوو", body: "- Baghdad airport ني flight: flight نا وقت سي 6 كلاك پظظلے.\n- Najaf airport ني flight: flight نا وقت سي 4 كلاك پظظلے.\n- نجف transfer: يھ دن 8:00 am." });
block("departure", "text", { title: "Missed the bus", body: "Contact the help desk or the transport mas'ool." }, { title: "Bus چهوٹي جائي", body: "Help desk يا transport نا مسئول نو رابطة كرو." });
block("departure", "facts", {}, {}, { refs: ["fact.phone.helpdesk", "fact.phone.transport"] });
todo("departure.najaf", "page.departure", "Steps for the transfer to Najaf", "نجف transfer نا steps");
todo("departure.airport", "page.departure", "Airport departure steps", "Airport روانگي نا steps");
todo("departure.luggage", "page.departure", "Luggage steps", "Luggage نا steps");

page("private", "travel", "car", "Private transport", "Private transport");
block("private", "text", { body: "Message the help desk, or call or message the transport mas'ool." }, { body: "Help desk نے message كرو، يا transport نا مسئول نے call يا message كرو." });
block("private", "facts", {}, {}, { refs: ["fact.phone.helpdesk", "fact.phone.transport"] });
todo("private.prices", "page.private", "Private transport routes and prices", "Private transport نا routes انے prices");

// --- More
page("contacts", "more", "phone", "Contacts", "رابطة");
block("contacts", "facts", {}, {}, {
  refs: ["fact.phone.helpdesk", "fact.phone.accommodation", "fact.phone.transport", "fact.phone.housekeeping", "fact.phone.maintenance", "fact.phone.orientation", "fact.phone.accounts", "fact.phone.wheelchair"],
});

page("faq", "more", "info", "Questions people ask", "سؤالات");
block("faq", "faq", {}, {});
todo("faq.items", "page.faq", "The FAQ", "سؤالات");

// ---------------------------------------------------------------------------
// Request types (Madad). Each can be switched off in admin.
// ---------------------------------------------------------------------------

const request = (id: string, icon: string, en: Loc, lud: Loc, data: Record<string, unknown> = {}) =>
  items.push({ id: `request.${id}`, kind: "request_type", grp: "requests", icon, en, lud, data });
request("housekeeping", "sparkles", { title: "Housekeeping", hint: "Fresh linen, or clean my room now" }, { title: "Housekeeping", hint: "نوي چادر، يا Room ني صفائي" },
  { options: [{ id: "linen", en: "Fresh linen", lud: "نوي چادر" }, { id: "clean", en: "Clean my room now", lud: "هوے Room ني صفائي كرو" }] });
request("maintenance", "wrench", { title: "Maintenance", hint: "Something is broken" }, { title: "Maintenance", hint: "كوئي چيز خراب چهے" }, { text: true, photo: true });
request("accommodation", "bed", { title: "Accommodation", hint: "A question about my room" }, { title: "Accommodation", hint: "Room نا بارے ما سؤال" }, { text: true });
request("wheelchair", "accessibility", { title: "Wheelchair", hint: "Request a wheelchair for a ziyarat" }, { title: "Wheelchair", hint: "زيارة واسطے wheelchair" }, { ziyarat: true });

export const SEED: SeedItem[] = items;
