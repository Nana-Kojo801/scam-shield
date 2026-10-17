import { describe, expect, it } from "vitest";
import { buildSegments } from "./annotate";

const flag = (quote: string) => ({ quote, why: "x" });

describe("buildSegments", () => {
  it("returns one plain segment when there are no flags", () => {
    expect(buildSegments("hello", [])).toEqual({ segments: [{ text: "hello", flag: null }], unplaced: [] });
  });
  it("splits around highlights and reassembles to the original text", () => {
    const msg = "Act now or your account will be closed. Pay a fee.";
    const { segments, unplaced } = buildSegments(msg, [flag("Pay a fee"), flag("Act now")]);
    expect(segments.map((s) => s.text).join("")).toBe(msg);
    expect(segments.filter((s) => s.flag !== null).map((s) => s.text)).toEqual(["Act now", "Pay a fee"]);
    expect(unplaced).toEqual([]);
  });
  it("keeps the flag index of the original array", () => {
    const { segments } = buildSegments("a b c", [flag("c"), flag("a")]);
    expect(segments.map((s) => s.flag)).toEqual([1, null, 0]);
  });
  it("keeps the earlier of two overlapping quotes and reports the other as unplaced", () => {
    const { segments, unplaced } = buildSegments("send your PIN now", [flag("your PIN now"), flag("send your PIN")]);
    expect(segments.map((s) => s.text).join("")).toBe("send your PIN now");
    expect(segments.find((s) => s.flag !== null)?.text).toBe("send your PIN");
    expect(unplaced).toEqual([0]);
  });
  it("reports quotes that are not in the message as unplaced", () => {
    expect(buildSegments("hello", [flag("nope")]).unplaced).toEqual([0]);
  });
  it("preserves newlines and special characters exactly", () => {
    const msg = "Line 1\n<b>bold</b> & more";
    const { segments } = buildSegments(msg, [flag("<b>bold</b>")]);
    expect(segments.map((s) => s.text).join("")).toBe(msg);
  });
});
