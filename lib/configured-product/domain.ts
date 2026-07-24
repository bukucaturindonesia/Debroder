import {
  CONFIGURED_OPTION_INPUT_TYPES,
  CONTRACT_VERSIONS,
  type ConfiguredAllocationDimension,
  type ConfiguredCompatibilityRule,
  type ConfiguredCondition,
  type ConfiguredOption,
  type ConfiguredOptionGroup,
  type ConfiguredProductDefinition,
  type ConfiguredProductDraft,
  type ConfiguredProductValidation,
  type ConfiguredSelection,
  type ConfiguredServiceRequirement,
  type ConfiguredUploadRequirement,
  type ContractFieldIssue,
  type ContractReference
} from "@/lib/contracts";

const MAX_DEFINITION_GROUPS = 100;
const MAX_OPTIONS_PER_GROUP = 500;
const MAX_DRAFT_ALLOCATIONS = 500;
const MAX_DRAFT_SERVICES = 100;
const MAX_DRAFT_UPLOADS = 100;
const MAX_TEXT_VALUE_LENGTH = 2_000;

export type ConfiguredProductDefinitionAuthority = {
  productId: string;
  productName: string;
  minimumQuantity: number;
  productUpdatedAt: string;
  configSchema: unknown;
};

export type ConfiguredProductDefinitionResult =
  | { ok: true; definition: ConfiguredProductDefinition }
  | { ok: false; issues: readonly ContractFieldIssue[] };

type StoredConfiguredProductDefinition = Omit<
  ConfiguredProductDefinition,
  "id" | "productId" | "name" | "quantityRules" | "policyReferences"
> & {
  maximumQuantity?: number;
  policyReferences?: readonly ContractReference[];
};

export function buildConfiguredProductDefinition(
  authority: ConfiguredProductDefinitionAuthority
): ConfiguredProductDefinitionResult {
  const issues: ContractFieldIssue[] = [];

  if (!isNonEmptyString(authority.productId)) {
    issues.push(issue("productId", "configured_product.definition.product_id_required", "Product ID wajib tersedia."));
  }
  if (!isNonEmptyString(authority.productName)) {
    issues.push(issue("productName", "configured_product.definition.product_name_required", "Nama produk wajib tersedia."));
  }
  if (!isPositiveInteger(authority.minimumQuantity)) {
    issues.push(issue("minimumQuantity", "configured_product.definition.minimum_invalid", "Minimum quantity wajib berupa bilangan bulat positif."));
  }
  if (!isIsoDate(authority.productUpdatedAt)) {
    issues.push(issue("productUpdatedAt", "configured_product.definition.updated_at_invalid", "Versi sumber produk tidak valid."));
  }

  const stored = parseStoredDefinition(authority.configSchema, issues);
  if (!stored || issues.length > 0) {
    return { ok: false, issues };
  }

  if (
    stored.maximumQuantity !== undefined
    && (
      !isPositiveInteger(stored.maximumQuantity)
      || stored.maximumQuantity < authority.minimumQuantity
    )
  ) {
    issues.push(issue(
      "configSchema.maximumQuantity",
      "configured_product.definition.maximum_invalid",
      "Maximum quantity harus berupa bilangan bulat dan tidak boleh lebih kecil dari minimum."
    ));
  }

  validateDefinitionInvariants(stored, issues);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    definition: {
      contractVersion: CONTRACT_VERSIONS.configuredProduct,
      id: authority.productId,
      productId: authority.productId,
      version: stored.version,
      code: stored.code,
      name: authority.productName,
      pricingMode: stored.pricingMode,
      quantityRules: {
        minimum: authority.minimumQuantity,
        ...(stored.maximumQuantity === undefined
          ? {}
          : { maximum: stored.maximumQuantity })
      },
      optionGroups: stored.optionGroups,
      compatibilityRules: stored.compatibilityRules,
      allocationDimensions: stored.allocationDimensions,
      serviceRequirements: stored.serviceRequirements,
      uploadRequirements: stored.uploadRequirements,
      policyReferences: [
        {
          type: "product_config_schema",
          id: authority.productId,
          version: authority.productUpdatedAt
        },
        ...(stored.policyReferences ?? [])
      ]
    }
  };
}

export function validateConfiguredProductDraft(
  definition: ConfiguredProductDefinition,
  draft: ConfiguredProductDraft,
  validatedAt: string
): ConfiguredProductValidation {
  const issues: ContractFieldIssue[] = [];

  if (!isIsoDate(validatedAt)) {
    issues.push(issue("validatedAt", "configured_product.validation.timestamp_invalid", "Waktu validasi tidak valid."));
  }
  if (draft.contractVersion !== CONTRACT_VERSIONS.configuredProduct) {
    issues.push(issue("contractVersion", "configured_product.draft.contract_version_mismatch", "Versi kontrak konfigurasi tidak didukung."));
  }
  if (!isNonEmptyString(draft.id)) {
    issues.push(issue("id", "configured_product.draft.id_required", "Configuration ID wajib tersedia."));
  }
  if (draft.definitionId !== definition.id || draft.definitionVersion !== definition.version) {
    issues.push(issue("definitionId", "configured_product.draft.definition_mismatch", "Definition konfigurasi telah berubah."));
  }
  if (!isIsoDate(draft.createdAt) || !isIsoDate(draft.updatedAt)) {
    issues.push(issue("updatedAt", "configured_product.draft.timestamp_invalid", "Timestamp konfigurasi tidak valid."));
  }
  if (!isPositiveInteger(draft.quantity)) {
    issues.push(issue("quantity", "configured_product.draft.quantity_invalid", "Quantity wajib berupa bilangan bulat positif."));
  } else {
    if (draft.quantity < definition.quantityRules.minimum) {
      issues.push(issue("quantity", "configured_product.draft.quantity_below_minimum", "Quantity belum memenuhi minimum konfigurasi."));
    }
    if (
      definition.quantityRules.maximum !== undefined
      && draft.quantity > definition.quantityRules.maximum
    ) {
      issues.push(issue("quantity", "configured_product.draft.quantity_above_maximum", "Quantity melebihi batas konfigurasi."));
    }
  }
  if (draft.note !== undefined && draft.note.length > MAX_TEXT_VALUE_LENGTH) {
    issues.push(issue("note", "configured_product.draft.note_too_long", "Catatan konfigurasi terlalu panjang."));
  }

  validateSelections(definition, draft.selections, issues);
  validateCompatibility(definition, draft.selections, issues);
  validateAllocations(definition, draft, issues);
  validateServices(definition, draft, issues);
  validateUploads(definition, draft, issues);

  const valid = issues.length === 0;
  return {
    valid,
    pricingStatus: valid && definition.pricingMode === "quotation_required"
      ? "quotation_required"
      : "unavailable",
    issues,
    warnings: [],
    validatedAt
  };
}

export function canonicalConfiguredProductInput(
  definition: ConfiguredProductDefinition,
  draft: ConfiguredProductDraft
): string {
  return stableSerialize({
    contractVersion: CONTRACT_VERSIONS.configuredProduct,
    definition: {
      id: definition.id,
      version: definition.version,
      productId: definition.productId ?? null,
      pricingMode: definition.pricingMode,
      quantityRules: definition.quantityRules,
      optionGroups: definition.optionGroups,
      compatibilityRules: definition.compatibilityRules,
      allocationDimensions: definition.allocationDimensions,
      serviceRequirements: definition.serviceRequirements,
      uploadRequirements: definition.uploadRequirements,
      policyReferences: definition.policyReferences
    },
    draft: {
      id: draft.id,
      definitionId: draft.definitionId,
      definitionVersion: draft.definitionVersion,
      quantity: draft.quantity,
      selections: draft.selections
        .map((selection) => ({
          ...selection,
          optionIds: [...selection.optionIds].sort()
        }))
        .sort(compareByStableKey),
      allocations: [...draft.allocations].sort(compareByStableKey),
      services: [...draft.services].sort(compareByStableKey),
      uploads: [...draft.uploads].sort(compareByStableKey),
      note: draft.note ?? null
    }
  });
}

function parseStoredDefinition(
  value: unknown,
  issues: ContractFieldIssue[]
): StoredConfiguredProductDefinition | null {
  if (!isRecord(value)) {
    issues.push(issue("configSchema", "configured_product.definition.schema_required", "Configured-product schema tidak tersedia."));
    return null;
  }
  const allowedKeys = new Set([
    "contractVersion",
    "version",
    "code",
    "pricingMode",
    "maximumQuantity",
    "optionGroups",
    "compatibilityRules",
    "allocationDimensions",
    "serviceRequirements",
    "uploadRequirements",
    "policyReferences"
  ]);
  Object.keys(value)
    .filter((key) => !allowedKeys.has(key))
    .forEach((key) => {
      issues.push(issue(
        `configSchema.${key}`,
        "configured_product.definition.field_unknown",
        "Configured-product schema memuat field yang tidak didukung."
      ));
    });
  if (value.contractVersion !== CONTRACT_VERSIONS.configuredProduct) {
    issues.push(issue("configSchema.contractVersion", "configured_product.definition.contract_version_mismatch", "Versi configured-product schema tidak didukung."));
  }

  const version = readRequiredString(value.version, "configSchema.version", issues);
  const code = readRequiredString(value.code, "configSchema.code", issues);
  const pricingMode = value.pricingMode === "server_priced" || value.pricingMode === "quotation_required"
    ? value.pricingMode
    : null;
  if (!pricingMode) {
    issues.push(issue("configSchema.pricingMode", "configured_product.definition.pricing_mode_invalid", "Pricing mode konfigurasi tidak didukung."));
  }

  const optionGroups = parseArray(
    value.optionGroups,
    "configSchema.optionGroups",
    issues,
    parseOptionGroup,
    MAX_DEFINITION_GROUPS
  );
  const compatibilityRules = parseArray(
    value.compatibilityRules,
    "configSchema.compatibilityRules",
    issues,
    parseCompatibilityRule,
    MAX_DEFINITION_GROUPS * 5
  );
  const allocationDimensions = parseArray(
    value.allocationDimensions,
    "configSchema.allocationDimensions",
    issues,
    parseAllocationDimension,
    MAX_DEFINITION_GROUPS
  );
  const serviceRequirements = parseArray(
    value.serviceRequirements,
    "configSchema.serviceRequirements",
    issues,
    parseServiceRequirement,
    MAX_DRAFT_SERVICES
  );
  const uploadRequirements = parseArray(
    value.uploadRequirements,
    "configSchema.uploadRequirements",
    issues,
    parseUploadRequirement,
    MAX_DRAFT_UPLOADS
  );
  const policyReferences = value.policyReferences === undefined
    ? []
    : parseArray(
        value.policyReferences,
        "configSchema.policyReferences",
        issues,
        parseContractReference,
        MAX_DEFINITION_GROUPS
      );
  const maximumQuantity = value.maximumQuantity === undefined
    ? undefined
    : readPositiveInteger(value.maximumQuantity, "configSchema.maximumQuantity", issues);

  if (
    !version
    || !code
    || !pricingMode
    || !optionGroups
    || !compatibilityRules
    || !allocationDimensions
    || !serviceRequirements
    || !uploadRequirements
    || !policyReferences
    || maximumQuantity === null
  ) {
    return null;
  }

  return {
    contractVersion: CONTRACT_VERSIONS.configuredProduct,
    version,
    code,
    pricingMode,
    optionGroups,
    compatibilityRules,
    allocationDimensions,
    serviceRequirements,
    uploadRequirements,
    ...(typeof maximumQuantity === "number" ? { maximumQuantity } : {}),
    policyReferences
  };
}

function parseOptionGroup(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): ConfiguredOptionGroup | null {
  if (!isRecord(value)) {
    issues.push(issue(path, "configured_product.definition.option_group_invalid", "Option group tidak valid."));
    return null;
  }
  const id = readRequiredString(value.id, `${path}.id`, issues);
  const code = readRequiredString(value.code, `${path}.code`, issues);
  const label = readRequiredString(value.label, `${path}.label`, issues);
  const inputType = CONFIGURED_OPTION_INPUT_TYPES.find((type) => type === value.inputType);
  if (!inputType) {
    issues.push(issue(`${path}.inputType`, "configured_product.definition.input_type_invalid", "Input type option group tidak didukung."));
  }
  const required = readBoolean(value.required, `${path}.required`, issues);
  const sortOrder = readNonNegativeInteger(value.sortOrder, `${path}.sortOrder`, issues);
  const options = parseArray(value.options, `${path}.options`, issues, parseOption, MAX_OPTIONS_PER_GROUP);
  const minimumSelections = value.minimumSelections === undefined
    ? undefined
    : readNonNegativeInteger(value.minimumSelections, `${path}.minimumSelections`, issues);
  const maximumSelections = value.maximumSelections === undefined
    ? undefined
    : readPositiveInteger(value.maximumSelections, `${path}.maximumSelections`, issues);

  if (
    !id
    || !code
    || !label
    || !inputType
    || required === null
    || sortOrder === null
    || !options
    || minimumSelections === null
    || maximumSelections === null
  ) {
    return null;
  }

  return {
    id,
    code,
    label,
    inputType,
    required,
    ...(typeof minimumSelections === "number" ? { minimumSelections } : {}),
    ...(typeof maximumSelections === "number" ? { maximumSelections } : {}),
    options,
    sortOrder
  };
}

function parseOption(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): ConfiguredOption | null {
  if (!isRecord(value)) {
    issues.push(issue(path, "configured_product.definition.option_invalid", "Option tidak valid."));
    return null;
  }
  const id = readRequiredString(value.id, `${path}.id`, issues);
  const code = readRequiredString(value.code, `${path}.code`, issues);
  const label = readRequiredString(value.label, `${path}.label`, issues);
  const sortOrder = readNonNegativeInteger(value.sortOrder, `${path}.sortOrder`, issues);
  const description = value.description === undefined
    ? undefined
    : readRequiredString(value.description, `${path}.description`, issues);
  const metadata = value.metadata === undefined
    ? undefined
    : readMetadata(value.metadata, `${path}.metadata`, issues);

  if (!id || !code || !label || sortOrder === null || description === null || metadata === null) {
    return null;
  }
  return {
    id,
    code,
    label,
    sortOrder,
    ...(typeof description === "string" ? { description } : {}),
    ...(metadata === undefined ? {} : { metadata })
  };
}

function parseCompatibilityRule(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): ConfiguredCompatibilityRule | null {
  if (!isRecord(value)) {
    issues.push(issue(path, "configured_product.definition.compatibility_rule_invalid", "Compatibility rule tidak valid."));
    return null;
  }
  const id = readRequiredString(value.id, `${path}.id`, issues);
  const effect = value.effect === "allow" || value.effect === "deny" || value.effect === "require"
    ? value.effect
    : null;
  if (!effect) {
    issues.push(issue(`${path}.effect`, "configured_product.definition.compatibility_effect_invalid", "Compatibility effect tidak didukung."));
  }
  const when = parseArray(value.when, `${path}.when`, issues, parseCondition, MAX_DEFINITION_GROUPS);
  const targets = parseArray(value.targets, `${path}.targets`, issues, parseCondition, MAX_DEFINITION_GROUPS);
  const message = value.message === undefined
    ? undefined
    : readRequiredString(value.message, `${path}.message`, issues);
  if (!id || !effect || !when || !targets || message === null) return null;
  return { id, effect, when, targets, ...(typeof message === "string" ? { message } : {}) };
}

function parseCondition(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): ConfiguredCondition | null {
  if (!isRecord(value)) {
    issues.push(issue(path, "configured_product.definition.condition_invalid", "Condition tidak valid."));
    return null;
  }
  const groupId = readRequiredString(value.groupId, `${path}.groupId`, issues);
  const optionIds = readStringArray(value.optionIds, `${path}.optionIds`, issues);
  if (!groupId || !optionIds) return null;
  return { groupId, optionIds };
}

function parseAllocationDimension(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): ConfiguredAllocationDimension | null {
  if (!isRecord(value)) {
    issues.push(issue(path, "configured_product.definition.dimension_invalid", "Allocation dimension tidak valid."));
    return null;
  }
  const id = readRequiredString(value.id, `${path}.id`, issues);
  const code = readRequiredString(value.code, `${path}.code`, issues);
  const label = readRequiredString(value.label, `${path}.label`, issues);
  const required = readBoolean(value.required, `${path}.required`, issues);
  const allowedValues = readStringArray(value.allowedValues, `${path}.allowedValues`, issues);
  if (!id || !code || !label || required === null || !allowedValues) return null;
  return { id, code, label, required, allowedValues };
}

function parseServiceRequirement(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): ConfiguredServiceRequirement | null {
  if (!isRecord(value)) {
    issues.push(issue(path, "configured_product.definition.service_invalid", "Service requirement tidak valid."));
    return null;
  }
  const id = readRequiredString(value.id, `${path}.id`, issues);
  const serviceCode = readRequiredString(value.serviceCode, `${path}.serviceCode`, issues);
  const label = readRequiredString(value.label, `${path}.label`, issues);
  const required = readBoolean(value.required, `${path}.required`, issues);
  const minimumQuantity = value.minimumQuantity === undefined
    ? undefined
    : readPositiveInteger(value.minimumQuantity, `${path}.minimumQuantity`, issues);
  const maximumQuantity = value.maximumQuantity === undefined
    ? undefined
    : readPositiveInteger(value.maximumQuantity, `${path}.maximumQuantity`, issues);
  if (
    !id
    || !serviceCode
    || !label
    || required === null
    || minimumQuantity === null
    || maximumQuantity === null
  ) return null;
  return {
    id,
    serviceCode,
    label,
    required,
    ...(typeof minimumQuantity === "number" ? { minimumQuantity } : {}),
    ...(typeof maximumQuantity === "number" ? { maximumQuantity } : {})
  };
}

function parseUploadRequirement(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): ConfiguredUploadRequirement | null {
  if (!isRecord(value)) {
    issues.push(issue(path, "configured_product.definition.upload_invalid", "Upload requirement tidak valid."));
    return null;
  }
  const id = readRequiredString(value.id, `${path}.id`, issues);
  const code = readRequiredString(value.code, `${path}.code`, issues);
  const label = readRequiredString(value.label, `${path}.label`, issues);
  const required = readBoolean(value.required, `${path}.required`, issues);
  const maximumFiles = readPositiveInteger(value.maximumFiles, `${path}.maximumFiles`, issues);
  const acceptedMimeTypes = readStringArray(value.acceptedMimeTypes, `${path}.acceptedMimeTypes`, issues);
  const maximumBytesPerFile = readPositiveInteger(value.maximumBytesPerFile, `${path}.maximumBytesPerFile`, issues);
  if (!id || !code || !label || required === null || maximumFiles === null || !acceptedMimeTypes || maximumBytesPerFile === null) {
    return null;
  }
  return { id, code, label, required, maximumFiles, acceptedMimeTypes, maximumBytesPerFile };
}

function parseContractReference(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): ContractReference | null {
  if (!isRecord(value)) {
    issues.push(issue(path, "configured_product.definition.reference_invalid", "Policy reference tidak valid."));
    return null;
  }
  const type = readRequiredString(value.type, `${path}.type`, issues);
  const id = readRequiredString(value.id, `${path}.id`, issues);
  const version = value.version === undefined
    ? undefined
    : readRequiredString(value.version, `${path}.version`, issues);
  if (!type || !id || version === null) return null;
  return { type, id, ...(typeof version === "string" ? { version } : {}) };
}

function validateDefinitionInvariants(
  definition: StoredConfiguredProductDefinition,
  issues: ContractFieldIssue[]
) {
  validateUnique(definition.optionGroups, "id", "configSchema.optionGroups", issues);
  validateUnique(definition.optionGroups, "code", "configSchema.optionGroups", issues);

  const groups = new Map(definition.optionGroups.map((group) => [group.id, group]));
  definition.optionGroups.forEach((group, groupIndex) => {
    const path = `configSchema.optionGroups.${groupIndex}`;
    validateUnique(group.options, "id", `${path}.options`, issues);
    validateUnique(group.options, "code", `${path}.options`, issues);
    const isSelect = group.inputType === "single_select" || group.inputType === "multi_select";
    if (isSelect && group.options.length === 0) {
      issues.push(issue(`${path}.options`, "configured_product.definition.options_required", "Select group wajib memiliki option."));
    }
    if (!isSelect && group.options.length > 0) {
      issues.push(issue(`${path}.options`, "configured_product.definition.scalar_options_forbidden", "Scalar group tidak boleh memiliki option."));
    }
    if (group.inputType === "single_select" && (
      (group.minimumSelections ?? 0) > 1
      || (group.maximumSelections ?? 1) > 1
    )) {
      issues.push(issue(path, "configured_product.definition.single_select_limit_invalid", "Single select hanya boleh memilih satu option."));
    }
    if (
      group.minimumSelections !== undefined
      && group.maximumSelections !== undefined
      && group.minimumSelections > group.maximumSelections
    ) {
      issues.push(issue(path, "configured_product.definition.selection_range_invalid", "Rentang jumlah selection tidak valid."));
    }
  });

  validateUnique(definition.compatibilityRules, "id", "configSchema.compatibilityRules", issues);
  definition.compatibilityRules.forEach((rule, ruleIndex) => {
    if (rule.when.length === 0 || rule.targets.length === 0) {
      issues.push(issue(
        `configSchema.compatibilityRules.${ruleIndex}`,
        "configured_product.definition.compatibility_condition_required",
        "Compatibility rule wajib memiliki when dan targets."
      ));
    }
    [...rule.when, ...rule.targets].forEach((condition, conditionIndex) => {
      const group = groups.get(condition.groupId);
      if (!group) {
        issues.push(issue(
          `configSchema.compatibilityRules.${ruleIndex}.conditions.${conditionIndex}.groupId`,
          "configured_product.definition.compatibility_group_unknown",
          "Compatibility rule merujuk option group yang tidak tersedia."
        ));
        return;
      }
      if (condition.optionIds.length === 0) {
        issues.push(issue(
          `configSchema.compatibilityRules.${ruleIndex}.conditions.${conditionIndex}.optionIds`,
          "configured_product.definition.compatibility_options_required",
          "Compatibility condition wajib memiliki option."
        ));
      }
      const optionIds = new Set(group.options.map((option) => option.id));
      if (condition.optionIds.some((optionId) => !optionIds.has(optionId))) {
        issues.push(issue(
          `configSchema.compatibilityRules.${ruleIndex}.conditions.${conditionIndex}.optionIds`,
          "configured_product.definition.compatibility_option_unknown",
          "Compatibility rule merujuk option yang tidak tersedia."
        ));
      }
    });
  });

  validateUnique(definition.allocationDimensions, "id", "configSchema.allocationDimensions", issues);
  validateUnique(definition.allocationDimensions, "code", "configSchema.allocationDimensions", issues);
  definition.allocationDimensions.forEach((dimension, index) => {
    if (dimension.allowedValues.length === 0 || new Set(dimension.allowedValues).size !== dimension.allowedValues.length) {
      issues.push(issue(
        `configSchema.allocationDimensions.${index}.allowedValues`,
        "configured_product.definition.dimension_values_invalid",
        "Allocation dimension wajib memiliki allowed value unik."
      ));
    }
  });

  validateUnique(definition.serviceRequirements, "id", "configSchema.serviceRequirements", issues);
  validateUnique(definition.serviceRequirements, "serviceCode", "configSchema.serviceRequirements", issues);
  definition.serviceRequirements.forEach((requirement, index) => {
    if (
      requirement.minimumQuantity !== undefined
      && requirement.maximumQuantity !== undefined
      && requirement.minimumQuantity > requirement.maximumQuantity
    ) {
      issues.push(issue(
        `configSchema.serviceRequirements.${index}`,
        "configured_product.definition.service_range_invalid",
        "Rentang quantity layanan tidak valid."
      ));
    }
  });

  validateUnique(definition.uploadRequirements, "id", "configSchema.uploadRequirements", issues);
  validateUnique(definition.uploadRequirements, "code", "configSchema.uploadRequirements", issues);
  definition.uploadRequirements.forEach((requirement, index) => {
    if (requirement.acceptedMimeTypes.length === 0) {
      issues.push(issue(
        `configSchema.uploadRequirements.${index}.acceptedMimeTypes`,
        "configured_product.definition.upload_mime_required",
        "Upload requirement wajib memiliki MIME type."
      ));
    }
  });
}

function validateSelections(
  definition: ConfiguredProductDefinition,
  selections: readonly ConfiguredSelection[],
  issues: ContractFieldIssue[]
) {
  const groupById = new Map(definition.optionGroups.map((group) => [group.id, group]));
  const selectionByGroup = new Map<string, ConfiguredSelection>();

  selections.forEach((selection, index) => {
    const path = `selections.${index}`;
    if (selectionByGroup.has(selection.groupId)) {
      issues.push(issue(path, "configured_product.selection.duplicate_group", "Satu option group hanya boleh memiliki satu selection."));
      return;
    }
    selectionByGroup.set(selection.groupId, selection);
    if (!groupById.has(selection.groupId)) {
      issues.push(issue(`${path}.groupId`, "configured_product.selection.group_unknown", "Option group tidak tersedia."));
    }
  });

  definition.optionGroups.forEach((group) => {
    const selection = selectionByGroup.get(group.id);
    const path = `selections.${group.code}`;
    if (!selection) {
      if (group.required) {
        issues.push(issue(path, "configured_product.selection.required", "Pilihan wajib belum diisi."));
      }
      return;
    }

    if (group.inputType === "single_select" || group.inputType === "multi_select") {
      const ids = selection.optionIds;
      const allowed = new Set(group.options.map((option) => option.id));
      if (new Set(ids).size !== ids.length) {
        issues.push(issue(path, "configured_product.selection.duplicate_option", "Option yang sama tidak boleh dipilih dua kali."));
      }
      if (ids.some((id) => !allowed.has(id))) {
        issues.push(issue(path, "configured_product.selection.option_unknown", "Option tidak tersedia."));
      }
      const minimum = group.minimumSelections ?? (group.required ? 1 : 0);
      const maximum = group.inputType === "single_select"
        ? 1
        : group.maximumSelections ?? group.options.length;
      if (ids.length < minimum || ids.length > maximum) {
        issues.push(issue(path, "configured_product.selection.count_invalid", "Jumlah option yang dipilih tidak valid."));
      }
      if (selection.textValue !== undefined || selection.numberValue !== undefined || selection.booleanValue !== undefined) {
        issues.push(issue(path, "configured_product.selection.scalar_forbidden", "Select group tidak menerima scalar value."));
      }
      return;
    }

    if (selection.optionIds.length > 0) {
      issues.push(issue(path, "configured_product.selection.option_forbidden", "Scalar group tidak menerima option ID."));
    }
    if (group.inputType === "text") {
      if (typeof selection.textValue !== "string" || (group.required && selection.textValue.trim().length === 0)) {
        issues.push(issue(path, "configured_product.selection.text_invalid", "Nilai teks wajib diisi."));
      } else if (selection.textValue.length > MAX_TEXT_VALUE_LENGTH) {
        issues.push(issue(path, "configured_product.selection.text_too_long", "Nilai teks terlalu panjang."));
      }
      if (selection.numberValue !== undefined || selection.booleanValue !== undefined) {
        issues.push(issue(path, "configured_product.selection.scalar_mismatch", "Jenis nilai tidak sesuai option group."));
      }
    } else if (group.inputType === "number") {
      if (typeof selection.numberValue !== "number" || !Number.isFinite(selection.numberValue)) {
        issues.push(issue(path, "configured_product.selection.number_invalid", "Nilai angka tidak valid."));
      }
      if (selection.textValue !== undefined || selection.booleanValue !== undefined) {
        issues.push(issue(path, "configured_product.selection.scalar_mismatch", "Jenis nilai tidak sesuai option group."));
      }
    } else {
      if (typeof selection.booleanValue !== "boolean") {
        issues.push(issue(path, "configured_product.selection.boolean_invalid", "Nilai boolean tidak valid."));
      }
      if (selection.textValue !== undefined || selection.numberValue !== undefined) {
        issues.push(issue(path, "configured_product.selection.scalar_mismatch", "Jenis nilai tidak sesuai option group."));
      }
    }
  });
}

function validateCompatibility(
  definition: ConfiguredProductDefinition,
  selections: readonly ConfiguredSelection[],
  issues: ContractFieldIssue[]
) {
  const byGroup = new Map(selections.map((selection) => [selection.groupId, new Set(selection.optionIds)]));
  definition.compatibilityRules.forEach((rule) => {
    if (!rule.when.every((condition) => conditionMatches(condition, byGroup))) return;

    if (rule.effect === "deny" && rule.targets.every((condition) => conditionMatches(condition, byGroup))) {
      issues.push(issue(
        "selections",
        "configured_product.compatibility.denied",
        rule.message ?? "Kombinasi pilihan tidak tersedia."
      ));
    }
    if (rule.effect === "require" && !rule.targets.every((condition) => conditionMatches(condition, byGroup))) {
      issues.push(issue(
        "selections",
        "configured_product.compatibility.required",
        rule.message ?? "Kombinasi pilihan membutuhkan option tambahan."
      ));
    }
    if (rule.effect === "allow") {
      const outsideAllowed = rule.targets.some((condition) => {
        const selected = byGroup.get(condition.groupId);
        const allowed = new Set(condition.optionIds);
        return selected ? [...selected].some((optionId) => !allowed.has(optionId)) : false;
      });
      if (outsideAllowed) {
        issues.push(issue(
          "selections",
          "configured_product.compatibility.not_allowed",
          rule.message ?? "Kombinasi pilihan tidak diizinkan."
        ));
      }
    }
  });
}

function validateAllocations(
  definition: ConfiguredProductDefinition,
  draft: ConfiguredProductDraft,
  issues: ContractFieldIssue[]
) {
  if (draft.allocations.length > MAX_DRAFT_ALLOCATIONS) {
    issues.push(issue("allocations", "configured_product.allocation.limit_exceeded", "Jumlah allocation melebihi batas sistem."));
    return;
  }
  if (definition.allocationDimensions.length === 0) {
    if (draft.allocations.length > 0) {
      issues.push(issue("allocations", "configured_product.allocation.not_supported", "Definition tidak mendukung allocation."));
    }
    return;
  }
  if (draft.allocations.length === 0) {
    issues.push(issue("allocations", "configured_product.allocation.required", "Allocation quantity wajib tersedia."));
    return;
  }

  const dimensionByCode = new Map(definition.allocationDimensions.map((dimension) => [dimension.code, dimension]));
  const ids = new Set<string>();
  let total = 0;
  draft.allocations.forEach((allocation, index) => {
    const path = `allocations.${index}`;
    if (!isNonEmptyString(allocation.id) || ids.has(allocation.id)) {
      issues.push(issue(`${path}.id`, "configured_product.allocation.id_invalid", "Allocation ID wajib unik."));
    }
    ids.add(allocation.id);
    if (!isPositiveInteger(allocation.quantity)) {
      issues.push(issue(`${path}.quantity`, "configured_product.allocation.quantity_invalid", "Allocation quantity tidak valid."));
    } else {
      total += allocation.quantity;
    }
    Object.entries(allocation.dimensions).forEach(([code, value]) => {
      const dimension = dimensionByCode.get(code);
      if (!dimension || !dimension.allowedValues.includes(value)) {
        issues.push(issue(`${path}.dimensions.${code}`, "configured_product.allocation.dimension_invalid", "Nilai allocation dimension tidak tersedia."));
      }
    });
    definition.allocationDimensions.forEach((dimension) => {
      if (dimension.required && !isNonEmptyString(allocation.dimensions[dimension.code])) {
        issues.push(issue(`${path}.dimensions.${dimension.code}`, "configured_product.allocation.dimension_required", "Allocation dimension wajib diisi."));
      }
    });
  });
  if (total !== draft.quantity) {
    issues.push(issue("allocations", "configured_product.allocation.quantity_mismatch", "Total allocation wajib sama dengan quantity konfigurasi."));
  }
}

function validateServices(
  definition: ConfiguredProductDefinition,
  draft: ConfiguredProductDraft,
  issues: ContractFieldIssue[]
) {
  if (draft.services.length > MAX_DRAFT_SERVICES) {
    issues.push(issue("services", "configured_product.service.limit_exceeded", "Jumlah layanan melebihi batas sistem."));
    return;
  }
  const requirementById = new Map(definition.serviceRequirements.map((requirement) => [requirement.id, requirement]));
  const selected = new Set<string>();
  draft.services.forEach((service, index) => {
    const path = `services.${index}`;
    const requirement = requirementById.get(service.requirementId);
    if (!requirement) {
      issues.push(issue(`${path}.requirementId`, "configured_product.service.unknown", "Layanan tidak tersedia."));
      return;
    }
    if (selected.has(service.requirementId)) {
      issues.push(issue(path, "configured_product.service.duplicate", "Layanan yang sama tidak boleh dipilih dua kali."));
    }
    selected.add(service.requirementId);
    if (service.serviceCode !== requirement.serviceCode) {
      issues.push(issue(`${path}.serviceCode`, "configured_product.service.code_mismatch", "Kode layanan tidak sesuai authority."));
    }
    if (!isPositiveInteger(service.quantity)) {
      issues.push(issue(`${path}.quantity`, "configured_product.service.quantity_invalid", "Quantity layanan tidak valid."));
    } else {
      if (requirement.minimumQuantity !== undefined && service.quantity < requirement.minimumQuantity) {
        issues.push(issue(`${path}.quantity`, "configured_product.service.below_minimum", "Quantity layanan belum memenuhi minimum."));
      }
      if (requirement.maximumQuantity !== undefined && service.quantity > requirement.maximumQuantity) {
        issues.push(issue(`${path}.quantity`, "configured_product.service.above_maximum", "Quantity layanan melebihi maximum."));
      }
      if (service.quantity > draft.quantity) {
        issues.push(issue(`${path}.quantity`, "configured_product.service.exceeds_configuration", "Quantity layanan tidak boleh melebihi quantity konfigurasi."));
      }
    }
    if (service.note !== undefined && service.note.length > MAX_TEXT_VALUE_LENGTH) {
      issues.push(issue(`${path}.note`, "configured_product.service.note_too_long", "Catatan layanan terlalu panjang."));
    }
  });
  definition.serviceRequirements
    .filter((requirement) => requirement.required && !selected.has(requirement.id))
    .forEach((requirement) => {
      issues.push(issue(
        `services.${requirement.serviceCode}`,
        "configured_product.service.required",
        "Layanan wajib belum dipilih."
      ));
    });
}

function validateUploads(
  definition: ConfiguredProductDefinition,
  draft: ConfiguredProductDraft,
  issues: ContractFieldIssue[]
) {
  if (draft.uploads.length > MAX_DRAFT_UPLOADS) {
    issues.push(issue("uploads", "configured_product.upload.limit_exceeded", "Jumlah upload melebihi batas sistem."));
    return;
  }
  const requirementById = new Map(definition.uploadRequirements.map((requirement) => [requirement.id, requirement]));
  const countByRequirement = new Map<string, number>();
  const uploadIds = new Set<string>();
  draft.uploads.forEach((upload, index) => {
    const path = `uploads.${index}`;
    const requirement = requirementById.get(upload.requirementId);
    if (!requirement) {
      issues.push(issue(`${path}.requirementId`, "configured_product.upload.unknown", "Upload requirement tidak tersedia."));
      return;
    }
    countByRequirement.set(upload.requirementId, (countByRequirement.get(upload.requirementId) ?? 0) + 1);
    if (!isNonEmptyString(upload.uploadId) || uploadIds.has(upload.uploadId)) {
      issues.push(issue(`${path}.uploadId`, "configured_product.upload.id_invalid", "Upload ID wajib unik."));
    }
    uploadIds.add(upload.uploadId);
    if (!isNonEmptyString(upload.fileName)) {
      issues.push(issue(`${path}.fileName`, "configured_product.upload.file_name_invalid", "Nama file tidak valid."));
    }
    if (!requirement.acceptedMimeTypes.includes(upload.mimeType)) {
      issues.push(issue(`${path}.mimeType`, "configured_product.upload.mime_invalid", "Jenis file tidak didukung."));
    }
    if (!isPositiveInteger(upload.sizeBytes) || upload.sizeBytes > requirement.maximumBytesPerFile) {
      issues.push(issue(`${path}.sizeBytes`, "configured_product.upload.size_invalid", "Ukuran file tidak valid."));
    }
  });
  definition.uploadRequirements.forEach((requirement) => {
    const count = countByRequirement.get(requirement.id) ?? 0;
    if (requirement.required && count === 0) {
      issues.push(issue(`uploads.${requirement.code}`, "configured_product.upload.required", "File wajib belum diunggah."));
    }
    if (count > requirement.maximumFiles) {
      issues.push(issue(`uploads.${requirement.code}`, "configured_product.upload.maximum_exceeded", "Jumlah file melebihi batas."));
    }
  });
}

function conditionMatches(
  condition: ConfiguredCondition,
  selections: ReadonlyMap<string, ReadonlySet<string>>
) {
  const selected = selections.get(condition.groupId);
  return Boolean(selected && condition.optionIds.every((optionId) => selected.has(optionId)));
}

function validateUnique<T extends Record<K, string>, K extends keyof T>(
  values: readonly T[],
  key: K,
  path: string,
  issues: ContractFieldIssue[]
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value[key])) {
      issues.push(issue(
        `${path}.${index}.${String(key)}`,
        "configured_product.definition.duplicate_identifier",
        "Identifier configured-product wajib unik."
      ));
    }
    seen.add(value[key]);
  });
}

function parseArray<T>(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[],
  parser: (entry: unknown, entryPath: string, entryIssues: ContractFieldIssue[]) => T | null,
  maximum: number
): T[] | null {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "configured_product.definition.array_required", "Field definition wajib berupa array."));
    return null;
  }
  if (value.length > maximum) {
    issues.push(issue(path, "configured_product.definition.limit_exceeded", "Jumlah definition entry melebihi batas sistem."));
    return null;
  }
  const parsed: T[] = [];
  value.forEach((entry, index) => {
    const result = parser(entry, `${path}.${index}`, issues);
    if (result) parsed.push(result);
  });
  return parsed.length === value.length ? parsed : null;
}

function readStringArray(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): string[] | null {
  if (!Array.isArray(value) || value.some((entry) => !isNonEmptyString(entry))) {
    issues.push(issue(path, "configured_product.definition.string_array_invalid", "Field wajib berupa array string non-empty."));
    return null;
  }
  return value.map((entry) => String(entry));
}

function readMetadata(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): Record<string, string | number | boolean | null> | null {
  if (!isRecord(value)) {
    issues.push(issue(path, "configured_product.definition.metadata_invalid", "Metadata option tidak valid."));
    return null;
  }
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      entry !== null
      && typeof entry !== "string"
      && typeof entry !== "number"
      && typeof entry !== "boolean"
    ) {
      issues.push(issue(`${path}.${key}`, "configured_product.definition.metadata_value_invalid", "Metadata hanya menerima scalar value."));
      return null;
    }
    output[key] = entry;
  }
  return output;
}

function readRequiredString(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): string | null {
  if (!isNonEmptyString(value)) {
    issues.push(issue(path, "configured_product.definition.string_required", "Field wajib berupa string non-empty."));
    return null;
  }
  return value;
}

function readBoolean(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): boolean | null {
  if (typeof value !== "boolean") {
    issues.push(issue(path, "configured_product.definition.boolean_required", "Field wajib berupa boolean."));
    return null;
  }
  return value;
}

function readPositiveInteger(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): number | null {
  if (!isPositiveInteger(value)) {
    issues.push(issue(path, "configured_product.definition.positive_integer_required", "Field wajib berupa bilangan bulat positif."));
    return null;
  }
  return value;
}

function readNonNegativeInteger(
  value: unknown,
  path: string,
  issues: ContractFieldIssue[]
): number | null {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    issues.push(issue(path, "configured_product.definition.non_negative_integer_required", "Field wajib berupa bilangan bulat non-negatif."));
    return null;
  }
  return Number(value);
}

function issue(field: string, code: string, message: string): ContractFieldIssue {
  return { field, code, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && Number.isFinite(Date.parse(value));
}

function compareByStableKey(left: unknown, right: unknown) {
  return stableSerialize(left).localeCompare(stableSerialize(right));
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (!isRecord(value)) {
    return JSON.stringify(value) ?? "null";
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",")}}`;
}
