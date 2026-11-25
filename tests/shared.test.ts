import { describe, expect, it } from "vitest";
import { addDays, isThuOrFri, karbalaNow, parseClock, parseRange } from "../shared/time";
import { ZIYARAT_NAMES, assemblyFor, isIts, kindOf, majlisDefault, parseSheetDate, parseTourId } from "../shared/ziyarat";

describe("Karbala time", () => {
  it("is UTC+3", () => {
    expect(karbalaNow(new Date("2026-11-25T21:30:00Z"))).toEqual({ date: "2026-11-26", weekday: 4, minutes: 30 });
  });
  it("knows Thursday and Friday", () => {
    expect(isThuOrFri("2026-11-26")).toBe(true);
    expect(isThuOrFri("2026-11-27")).toBe(true);
    expect(isThuOrFri("2026-11-28")).toBe(false);
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  });
  it("reads hour ranges as typed in admin", () => {
    expect(parseRange("8:00 am to 2:30 pm")).toEqual([480, 870]);
    expect(parseRange("7:15 to 8:30 pm")).toEqual([1155, 1230]);
    expect(parseRange("7:00 to 8:30 am")).toEqual([420, 510]);
    expect(parseRange("11:00 to 1:00 pm")).toEqual([660, 780]);
    expect(parseRange("Morning: 8:00 to 8:45 am")).toEqual([480, 525]);
    expect(parseRange("After Maghrib namaz to 8:30 pm")).toBeNull();
    expect(parseClock("6:15 am")).toBe(375);
    expect(parseClock("As per ITS")).toBeNull();
  });
});

describe("ziyarat rules carried over from zt", () => {
  it("uses the names fixed by the brief", () => {
    expect(ZIYARAT_NAMES.atraaf).toBe("Karbala Mualla Atraaf - Atabaat Aaliyah");
    expect(ZIYARAT_NAMES.baghdad).toBe("Baghdad Atabaat Aaliyah");
    expect(Object.values(ZIYARAT_NAMES).join(" ")).not.toMatch(/Baghdad Atraf/i);
  });
  it("maps the sheet's wording", () => {
    expect(kindOf("Pehli Ziyarat")).toBe("pehli");
    expect(kindOf("Pehli Ziyarat", "late")).toBe("pehli-late");
    expect(kindOf("Karbala Atraf")).toBe("atraaf");
    expect(kindOf("Baghdad Atraf")).toBe("baghdad");
    expect(kindOf("Wadaa Ziyarat")).toBe("wada");
    expect(kindOf("Something else")).toBeNull();
  });
  it("Pehli Ziyarat: 2:00 PM, Najmi Masjid on Thursday and Friday, otherwise the Haram", () => {
    expect(assemblyFor("pehli", "2026-11-26")).toEqual({ time: "2:00 PM", place: "najmi" });
    expect(assemblyFor("pehli", "2026-11-27")).toEqual({ time: "2:00 PM", place: "najmi" });
    expect(assemblyFor("pehli", "2026-11-28")).toEqual({ time: "2:00 PM", place: "haram6" });
    expect(assemblyFor("pehli", "2026-11-28", false)).toBeNull();
    expect(assemblyFor("pehli-late", "2026-11-28")).toEqual({ time: "8:30 PM", place: "najmi" });
  });
  it("Baghdad leaves from Al Imara, Atraaf gathers at Mujamma Kauthar", () => {
    expect(assemblyFor("baghdad", "2026-11-28")).toEqual({ time: "8:00 AM", place: "emarah", bus: true });
    expect(assemblyFor("atraaf", "2026-11-28")).toEqual({ time: "8:15 AM", place: "kawthar" });
  });
  it("Wada Ziyarat and the majlis follow the weekday", () => {
    expect(assemblyFor("wada", "2026-11-27")).toEqual({ time: null, timeKey: "after-maghrib-isha", place: "najmi" });
    expect(assemblyFor("wada", "2026-11-29")).toEqual({ time: "9:30 PM", place: "haram6" });
    expect(majlisDefault("2026-11-26").place).toBe("najmi");
    expect(majlisDefault("2026-11-28")).toEqual({ time: "9:30 PM", place: "haram6" });
  });
  it("reads sheet dates and tour IDs", () => {
    expect(parseSheetDate("Monday, October 26, 2026")).toBe("2026-10-26");
    expect(parseTourId("26/5253")).toEqual({ season: "26", number: "5253" });
    expect(parseTourId("26-5253")).toEqual({ season: "26", number: "5253" });
    expect(parseTourId(" 5253 ")).toEqual({ season: null, number: "5253" });
    expect(parseTourId("265253")).toEqual({ season: "26", number: "5253" });
    expect(parseTourId("٥٢٥٣")).toEqual({ season: null, number: "5253" });
    expect(parseTourId("26/0850")).toEqual({ season: "26", number: "850" });
    expect(parseTourId("abc")).toBeNull();
    expect(isIts("12345678")).toBe(true);
    expect(isIts("1234567")).toBe(false);
  });
});
