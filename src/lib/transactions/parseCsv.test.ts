import { describe, expect, it } from "vitest";
import { decodeCsvBytes, parseAmountToCents, parseCsv, parseFrenchDate } from "./parseCsv";

const HEADER =
  "Date transaction;Date comptabilisation;Num Compte;Libellé Compte;Libellé opération;Libellé complet;Catégorie;Sous-Catégorie;Montant;Pointée;";

describe("parseCsv", () => {
  it("parses French dates and decimal commas", () => {
    expect(parseFrenchDate("31/01/2026")).toBe("2026-01-31");
    expect(parseFrenchDate("1/9/2026")).toBe("2026-09-01");
    expect(parseFrenchDate("01-09-2026")).toBe("2026-09-01");
    expect(parseFrenchDate("01.09.26")).toBe("2026-09-01");
    expect(parseFrenchDate("2026-09-30")).toBe("2026-09-30");
    expect(parseAmountToCents("-10.00 EUR")).toBe(-1000);
    expect(parseAmountToCents("-11,30")).toBe(-1130);
    expect(parseAmountToCents("1 234,56")).toBe(123456);
    expect(parseAmountToCents("1.234,56")).toBe(123456);
  });

  it("parses a semicolon CSV and keeps a quoted semicolon", () => {
    const csv = [
      HEADER,
      '15/03/2026;16/03/2026;BE00;Compte courant;CARTE;LIDL "CITY; CENTRE";Courses;Supermarche;-12,50;Oui;',
      "01/03/2026;01/03/2026;BE00;Compte courant;VIR;SALAIRE;Revenus;Salaire;2.500,00;Non;",
    ].join("\n");

    const rows = parseCsv(csv).rows;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      transactionDate: "2026-03-15",
      bookingDate: "2026-03-16",
      fullLabel: "LIDL CITY; CENTRE",
      bankCategory: "Courses",
      amountCents: -1250,
      pointed: true,
    });
    expect(rows[1].amountCents).toBe(250000);
    expect(rows[1].pointed).toBe(false);
  });

  it("decodes Windows-1252 when UTF-8 is invalid", () => {
    const csv = `${HEADER}\n15/03/2026;16/03/2026;BE00;Compte;CARTE;INTERMARCHÉ;Courses;Supermarche;-8,10;Oui;\n`;
    const bytes = Uint8Array.from([...csv].map((char) => char.charCodeAt(0)));

    const text = decodeCsvBytes(bytes);
    expect(text).toContain("INTERMARCHÉ");
    expect(parseCsv(text).rows[0].fullLabel).toBe("INTERMARCHÉ");
  });

  it("accepts a reordered header, a sep line and accent-free names", () => {
    const csv = [
      "sep=;",
      "Montant EUR;Libelle;Date transaction;Date de comptabilisation;Categorie;Pointee",
      "-9,90;NAVI MOUSCRON;02/04/2026;03/04/2026;Courses;Non",
    ].join("\n");

    const rows = parseCsv(csv).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      transactionDate: "2026-04-02",
      bookingDate: "2026-04-03",
      fullLabel: "NAVI MOUSCRON",
      bankCategory: "Courses",
      amountCents: -990,
      pointed: false,
    });
  });

  it("skips a leading balance line and reads the operation header", () => {
    const csv = [
      "00000000000;01/10/2026;01/11/2026;2;01/11/2026;-10.00 EUR",
      "",
      "Date de l'opération;Libellé;Détail de l'écriture;Montant de l'opération;Devise",
      "02/11/2026;CARTE;CARTE LIDL;-12,40;EUR",
      "01/11/2026;VIR;VIR SALAIRE;1.500,00;EUR",
      "pas une date;CARTE;BROKEN;abc;EUR",
      "15/09/2026;CARTE;AUCHAN;-42,10;EUR",
    ].join("\n");

    const parsed = parseCsv(csv);
    const rows = parsed.rows;
    expect(parsed.skipped).toHaveLength(1);
    expect(rows).toHaveLength(3);
    expect(rows[2].transactionDate).toBe("2026-09-15");
    expect(rows[0]).toMatchObject({
      transactionDate: "2026-11-02",
      operationLabel: "CARTE",
      fullLabel: "CARTE LIDL",
      amountCents: -1240,
    });
    expect(rows[1].amountCents).toBe(150000);
  });

  it("decodes a UTF-8 file", () => {
    const csv = `${HEADER}\n15/03/2026;16/03/2026;BE00;Compte;CARTE;Intermarché;Courses;Supermarche;-8,10;Oui;\n`;
    const text = decodeCsvBytes(new TextEncoder().encode(csv));
    expect(parseCsv(text).rows[0].fullLabel).toBe("Intermarché");
  });
});
