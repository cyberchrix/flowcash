export type TransactionKind = "expense" | "income" | "transfer";

export type RawBankRow = {
  transactionDate: string;
  bookingDate: string | null;
  accountNumber: string;
  accountLabel: string;
  operationLabel: string;
  fullLabel: string;
  bankCategory: string;
  bankSubcategory: string;
  amountCents: number;
  currency: string;
  pointed: boolean;
};

export type UserCategorizationRule = {
  pattern: string;
  categoryName: string;
  categoryId?: string;
  amountCents?: number | null;
  kind?: TransactionKind | null;
  needsReview: boolean;
  priority: number;
};

export type Categorization = {
  normalizedMerchant: string;
  kind: TransactionKind;
  categoryName: string | null;
  needsReview: boolean;
};
