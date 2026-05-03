import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = new URL("../outputs/", import.meta.url);
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const leads = workbook.worksheets.add("Leads");
const setup = workbook.worksheets.add("Setup");

leads.getRange("A1:L1").values = [[
  "Timestamp",
  "Student name",
  "Email",
  "Grade",
  "Subject",
  "Session format",
  "City / neighbourhood",
  "Goal",
  "Page URL",
  "User agent",
  "Status",
  "Notes"
]];

leads.getRange("A1:L1").format = {
  fill: "#0A369D",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true
};
leads.getRange("A:L").format.columnWidthPx = 150;
leads.getRange("A:A").format.columnWidthPx = 150;
leads.getRange("H:H").format.columnWidthPx = 260;
leads.getRange("I:J").format.columnWidthPx = 220;
leads.getRange("L:L").format.columnWidthPx = 220;
leads.freezePanes.freezeRows(1);
leads.showGridLines = false;
leads.tables.add("A1:L2", true, "BrainBuddiesLeads");

setup.getRange("A1:B8").values = [
  ["Brain Buddies form setup", ""],
  ["Sheet tab to append to", "Leads"],
  ["Expected endpoint", "Google Apps Script Web App"],
  ["Required form fields", "studentName, email, grade, subject, format"],
  ["Optional form fields", "location, goal"],
  ["Timestamp source", "Browser submit time"],
  ["Status values", "New, Contacted, Booked, Closed"],
  ["Deployment note", "Paste the Web App URL into GOOGLE_SHEET_WEB_APP_URL in script.js"]
];
setup.getRange("A1:B1").format = {
  fill: "#17C96B",
  font: { bold: true, color: "#15120F" }
};
setup.getRange("A:B").format.columnWidthPx = 260;
setup.showGridLines = false;

const preview = await workbook.render({
  sheetName: "Leads",
  range: "A1:L8",
  scale: 1,
  format: "png"
});
await fs.writeFile(new URL("brain-buddies-leads-preview.png", outputDir), new Uint8Array(await preview.arrayBuffer()));

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(new URL("brain-buddies-leads.xlsx", outputDir));
