import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { excelSerialToFrenchDate, parseXlsx } from "./parseXlsx";

function workbook(sheet: string, strings: string): Uint8Array {
  return zipSync({
    "xl/sharedStrings.xml": strToU8(strings),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
  });
}

describe("parseXlsx", () => {
  it("converts an Excel serial date from the mobile export", () => {
    expect(excelSerialToFrenchDate(46352)).toBe("26/11/2026");
    const shared = `<?xml version="1.0"?><sst><si><t>Date transaction</t></si><si><t>Libellé opération</t></si><si><t>Libellé complet</t></si><si><t>Montant</t></si><si><t>Pointée</t></si><si><t>CARTE</t></si><si><t>CARTE LIDL</t></si><si><t>Non</t></si></sst>`;
    const sheet = `<?xml version="1.0"?><worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c></row>
      <row r="2"><c r="A2"><v>46352</v></c><c r="B2" t="s"><v>5</v></c><c r="C2" t="s"><v>6</v></c><c r="D2"><v>-2.2999999999999998</v></c><c r="E2" t="s"><v>7</v></c></row>
    </sheetData></worksheet>`;

    expect(parseXlsx(workbook(sheet, shared)).rows[0]).toMatchObject({
      transactionDate: "2026-11-26",
      operationLabel: "CARTE",
      fullLabel: "CARTE LIDL",
      amountCents: -230,
      pointed: false,
    });
  });
});
