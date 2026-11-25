import { describe, expect, it } from "vitest";
import { isAllowedRead, tourRef } from "../worker/nkerp";
import { findTour } from "../worker/schedule";

describe("NKERP is read-only", () => {
  it("allows only the validated reads", () => {
    for (const p of ["api/accounts/Login", "api/Property/getRoomDetailsforDeallocation", "api/property/getRoomallocationSearchResult",
      "api/VisitingPoint/getReleasedTours", "api/user/GetSectionIdByGroupId/74", "api/user/GetSectionIdByGroupId/13"]) expect(isAllowedRead(p), p).toBe(true);
  });
  it("refuses every write, and GETs that write", () => {
    for (const p of ["api/tours/UpdateZiyaratStatus/123/false/4", "api/VisitingPoint/saveZiyaratSchedule", "api/VisitingPoint/ReleaseZiyaratSchedule",
      "api/VisitingPoint/deleteZiyaratSceduleByIds", "api/tours/approvalActionOnTour", "api/tours/updatetourplan", "api/Property/saveRoomallocationApplicantsDetails",
      "api/Property/saveRoomReallocationApplicantsDetails", "api/Property/DeallocateApplicants", "api/property/UpdateRoomStatus", "api/tours/getTourDetail/1",
      "api/user/GetSectionIdByGroupId/1", "updateChat", "saveChat"]) expect(isAllowedRead(p), p).toBe(false);
  });
  it("writes tour references the NKERP way", () => {
    expect(tourRef("26/5253")).toBe("NKERP/TOUR/2026/5253");
  });
});

describe("finding a tour in the Sheet's schedule", () => {
  const snap = {
    fetchedAt: 0, v: 2,
    rows: [
      ["25/5253", "Monday, November 24, 2025", "Pehli Ziyarat", "", "", "", ""],
      ["26/5253", "Thursday, November 26, 2026", "Pehli Ziyarat", "", "", "", "late"],
      ["26/5253", "Friday, November 27, 2026", "Karbala Atraf", "", "", "", ""],
      ["26/5253", "Saturday, November 28, 2026", "Baghdad Atraf", "", "", "", ""],
      ["26/5253", "Sunday, November 29, 2026", "Wadaa Ziyarat", "", "", "", ""],
      ["26/0850", "Sunday, November 29, 2026", "Wadaa Ziyarat", "", "", "", ""],
    ] as [string, string, string, string, string, string, string?][],
  };
  it("picks the current season when only four digits are typed", () => {
    const t = findTour(snap, { season: null, number: "5253" }, "2026-11-27")!;
    expect(t.tour).toBe("26/5253");
    expect(t.days.map((d) => d.kind)).toEqual(["pehli-late", "atraaf", "baghdad", "wada"]);
    expect(t.days[2].name).toBe("Baghdad Atabaat Aaliyah");
  });
  it("honours a typed season and leading zeros", () => {
    expect(findTour(snap, { season: "25", number: "5253" }, "2026-11-27")!.tour).toBe("25/5253");
    expect(findTour(snap, { season: null, number: "850" }, "2026-11-27")!.tour).toBe("26/0850");
    expect(findTour(snap, { season: null, number: "1111" }, "2026-11-27")).toBeNull();
  });
});
