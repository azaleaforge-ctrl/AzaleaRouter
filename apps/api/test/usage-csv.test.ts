import assert from "node:assert/strict";
import test from "node:test";
import { csvCell } from "../src/routes/usage.js";

test("CSV cells quote commas, newlines, and embedded quotation marks", () => {
  assert.equal(csvCell('hello,"world"'), '"hello,""world"""');
  assert.equal(csvCell("line one\\nline two"), '"line one\\nline two"');
});

test("CSV cells neutralize spreadsheet formula starters", () => {
  assert.equal(csvCell("=SUM(1,2)"), "\\"'=SUM(1,2)\\"");
  assert.equal(csvCell("  +cmd|' /C calc'!A0"), "\\"'  +cmd|' /C calc'!A0\\"");
  assert.equal(csvCell("@HYPERLINK(1)"), "\\"'@HYPERLINK(1)\\"");
  assert.equal(csvCell("-1"), "\\"'-1\\"");
});

test("CSV cells preserve numeric strings and empty values", () => {
  assert.equal(csvCell("123456"), '"123456"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(undefined), '""');
});
