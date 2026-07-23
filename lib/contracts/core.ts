export type EntityId = string;
export type IsoDateTime = string;
export type LocaleCode = string;
export type CurrencyCode = "IDR";

export type ContractReference = {
  type: string;
  id: EntityId;
  version?: string;
};

export type ContractWarning = {
  code: string;
  message: string;
  field?: string;
};

export type ContractFieldIssue = {
  field: string;
  code: string;
  message: string;
};

export type ContractSuccess<TData> = {
  ok: true;
  data: TData;
  warnings: readonly ContractWarning[];
};

export type ContractFailure<TError> = {
  ok: false;
  error: TError;
};

export type ContractResult<TData, TError> = ContractSuccess<TData> | ContractFailure<TError>;
