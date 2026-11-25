import { describe, expect, it } from "vitest";
import { SEED } from "../worker/seed";
import { toPublic, type ContentRow } from "../worker/content";

const row = (s: (typeof SEED)[number], over: Partial<ContentRow> = {}): ContentRow => ({
  id: s.id, kind: s.kind, grp: s.grp ?? "", sort: 0, icon: "", en: JSON.stringify(s.en ?? {}), lud: JSON.stringify(s.lud ?? {}),
  data: JSON.stringify(s.data ?? {}), lud_ok: 0, missing: s.missing ? 1 : 0, audience: s.audience ?? "public", enabled: 1, updated_at: "", ...over,
});

describe("seed content", () => {
  it("has unique IDs", () => {
    expect(new Set(SEED.map((s) => s.id)).size).toBe(SEED.length);
  });
  it("points only at things that exist", () => {
    const ids = new Set(SEED.map((s) => s.id));
    for (const s of SEED) {
      const d = s.data ?? {};
      for (const ref of [d.ref, d.to, ...((d.refs as string[]) ?? []), ...((d.facts as string[]) ?? [])]) if (ref) expect(ids.has(ref as string), `${s.id} -> ${ref}`).toBe(true);
      if (s.kind === "block") expect(ids.has(s.grp!), `${s.id} page`).toBe(true);
    }
  });
  it("keeps Lisan ud-Dawat to the house letters", () => {
    for (const s of SEED) for (const v of Object.values(s.lud ?? {})) {
      expect(v, s.id).not.toMatch(/[یکہۃآ؛]/); // ی ک ہ ۃ آ ؛
      expect(v, s.id).not.toMatch(/[٠-٩]\s*[ap]m/);
    }
  });
  it("never ships the Wi-Fi password or any phone number in code", () => {
    const wifi = SEED.find((s) => s.id === "fact.wifi.password")!;
    expect(wifi.missing).toBe(true);
    expect(wifi.en?.value).toBe("");
    expect(JSON.stringify(SEED)).not.toMatch(/\+?\d{10,}/);
  });
  it("does not mention Najaf except as a place to travel to or from, or mansak at all", () => {
    expect(JSON.stringify(SEED)).not.toMatch(/mansak|sub-venue/i);
  });
});

describe("what a zair's phone receives", () => {
  it("holds back unapproved Lisan and unfilled values", () => {
    const izan = SEED.find((s) => s.kind === "block" && s.grp === "page.izan")!;
    expect(toPublic(row(izan)).l).toBeNull();
    expect(toPublic(row(izan, { lud_ok: 1 })).l?.body).toContain("اذن");
    const owed = SEED.find((s) => s.id === "fact.phone.accommodation")!;
    const pub = toPublic(row(owed, { en: JSON.stringify({ label: "L", value: "secret" }), data: JSON.stringify({ type: "phone", v: "123" }) }));
    expect(pub.missing).toBe(true);
    expect(pub.t).toEqual({ label: "L" });
    expect(pub.data).toEqual({ type: "phone" });
  });
});
