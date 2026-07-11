"use client";

import { useMemo, useState } from "react";
import type {
  CustomService,
  Product,
  ProductMinimumRule,
  ProductPriceTier,
  ProductVariant,
  ProductVariantSize,
  ServicePricingType,
  ValidationIssue
} from "@/lib/types";
import { validatePublishProduct } from "@/lib/product-validation";

interface PimV2ClientProps {
  products: Product[];
  services: CustomService[];
}

export function PimV2Client({ products, services }: PimV2ClientProps) {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const [token, setToken] = useState("");
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? products[0],
    [products, selectedProductId]
  );
  const [draft, setDraft] = useState<Product | null>(selectedProduct ?? null);
  const [serviceDrafts, setServiceDrafts] = useState<CustomService[]>(
    cloneServices(services)
  );
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  function selectProduct(productId: string) {
    const product = products.find((candidate) => candidate.id === productId) ?? null;
    setSelectedProductId(productId);
    setDraft(product ? cloneProduct(product) : null);
    setIssues([]);
    setStatus(null);
  }

  function patchProduct(patch: Partial<Product>) {
    if (!draft) {
      return;
    }

    setDraft({ ...draft, ...patch });
  }

  function patchVariant(variantId: string, patch: Partial<ProductVariant>) {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      variants: draft.variants.map((variant) => {
        if (variant.id !== variantId) {
          return patch.isDefault ? { ...variant, isDefault: false } : variant;
        }

        return { ...variant, ...patch };
      })
    });
  }

  function patchVariantSize(
    variantId: string,
    variantSizeId: string,
    patch: Partial<ProductVariantSize>
  ) {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      variants: draft.variants.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              sizes: variant.sizes.map((variantSize) =>
                variantSize.id === variantSizeId
                  ? { ...variantSize, ...patch }
                  : variantSize
              )
            }
          : variant
      )
    });
  }

  function patchPriceTier(tierId: string, patch: Partial<ProductPriceTier>) {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      priceTiers: (draft.priceTiers ?? []).map((tier) =>
        tier.id === tierId ? { ...tier, ...patch } : tier
      )
    });
  }

  function addPriceTier() {
    if (!draft) {
      return;
    }

    const tiers = draft.priceTiers ?? [];
    const lastTier = [...tiers]
      .sort((a, b) => a.minQuantity - b.minQuantity)
      .at(-1);
    const minQuantity = lastTier?.maxQuantity ? lastTier.maxQuantity + 1 : 1;
    const nextTier: ProductPriceTier = {
      id: `new-tier-${Date.now()}`,
      productId: draft.id,
      minQuantity,
      maxQuantity: null,
      unitPrice: draft.basePrice,
      quoteRequired: false,
      status: "active",
      sortOrder: (tiers.length + 1) * 10
    };

    setDraft({ ...draft, priceTiers: [...tiers, nextTier] });
  }

  function removePriceTier(tierId: string) {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      priceTiers: (draft.priceTiers ?? []).filter((tier) => tier.id !== tierId)
    });
  }

  function patchMinimumRule(patch: Partial<ProductMinimumRule>) {
    if (!draft) {
      return;
    }

    const currentRule: ProductMinimumRule =
      draft.minimumRule ?? {
        id: `new-minimum-${Date.now()}`,
        productId: draft.id,
        minimumQuantity: 1,
        minimumForTierQuantity: null,
        quotationQuantity: null,
        status: "active"
      };

    setDraft({ ...draft, minimumRule: { ...currentRule, ...patch } });
  }

  function patchService(serviceId: string, patch: Partial<CustomService>) {
    setServiceDrafts((current) =>
      current.map((service) =>
        service.id === serviceId ? { ...service, ...patch } : service
      )
    );
  }

  function addService() {
    const nextIndex = serviceDrafts.length + 1;
    setServiceDrafts((current) => [
      ...current,
      {
        id: `new-service-${Date.now()}`,
        slug: `layanan-${nextIndex}`,
        name: `Layanan ${nextIndex}`,
        description: null,
        status: "active",
        pricingType: "fixed_per_item",
        basePrice: 0,
        estimatedMinPrice: null,
        estimatedMaxPrice: null,
        minimumQuantity: 1,
        maximumQuantity: null,
        requiresUpload: false,
        requiresNotes: false,
        requiresReview: false,
        allowedFileTypes: ["png", "jpg", "jpeg", "pdf"],
        isStackable: true,
        exclusiveGroup: null,
        sortOrder: nextIndex * 10,
        pricingRules: []
      }
    ]);
  }

  function addVariant() {
    if (!draft) {
      return;
    }

    const nextIndex = draft.variants.length + 1;
    const firstSize = draft.variants[0]?.sizes[0]?.size;
    const nextVariant: ProductVariant = {
      id: `new-variant-${Date.now()}`,
      productId: draft.id,
      name: `Warna ${nextIndex}`,
      slug: `warna-${nextIndex}`,
      hexCode: "#000000",
      sku: `${draft.sku ?? draft.slug.toUpperCase()}-${nextIndex}`,
      sortOrder: nextIndex * 10,
      isDefault: draft.variants.length === 0,
      status: "active",
      priceAdjustment: 0,
      images: [],
      sizes: firstSize
        ? [
            {
              id: `new-size-${Date.now()}`,
              variantId: `new-variant-${Date.now()}`,
              sizeId: firstSize.id,
              sku: `${draft.sku ?? draft.slug.toUpperCase()}-${nextIndex}-${firstSize.slug.toUpperCase()}`,
              stockQuantity: 0,
              priceAdjustment: 0,
              status: "active",
              size: firstSize
            }
          ]
        : []
    };

    setDraft({ ...draft, variants: [...draft.variants, nextVariant] });
  }

  async function validateServer() {
    if (!draft) {
      return;
    }

    setStatus("Memvalidasi...");
    const response = await fetch("/api/admin/pim-v2/validate-publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: draft })
    });
    const payload = (await response.json()) as { issues?: ValidationIssue[] };
    setIssues(payload.issues ?? []);
    setStatus(response.ok ? "Validasi selesai." : "Validasi gagal.");
  }

  async function saveDraft() {
    if (!draft) {
      return;
    }

    const localIssues = validatePublishProduct(draft);
    setIssues(localIssues);

    if (localIssues.some((issue) => issue.severity === "error")) {
      setStatus("Perbaiki error sebelum simpan.");
      return;
    }

    setStatus("Menyimpan...");
    const response = await fetch("/api/admin/pim-v2/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ product: draft })
    });
    const payload = (await response.json()) as { error?: string; issues?: ValidationIssue[] };
    setIssues(payload.issues ?? []);
    setStatus(response.ok ? "Draft tersimpan." : payload.error ?? "Simpan gagal.");
  }

  async function saveServices() {
    setStatus("Menyimpan layanan...");
    const response = await fetch("/api/admin/pim-v2/custom-services", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ services: serviceDrafts })
    });
    const payload = (await response.json()) as {
      error?: string;
      issues?: ValidationIssue[];
    };
    setIssues(payload.issues ?? []);
    setStatus(response.ok ? "Layanan tersimpan." : payload.error ?? "Simpan gagal.");
  }

  if (!draft) {
    return <div className="notice">Belum ada produk.</div>;
  }

  return (
    <div className="admin-grid">
      <aside className="admin-panel">
        <h2 className="section-title">Produk</h2>
        {products.map((product) => (
          <button
            className={
              product.id === draft.id ? "primary-button" : "secondary-button"
            }
            key={product.id}
            onClick={() => selectProduct(product.id)}
            type="button"
          >
            {product.name}
          </button>
        ))}
      </aside>

      <section className="admin-panel">
        <div className="field-grid">
          <Field label="Nama">
            <input
              className="text-input"
              onChange={(event) => patchProduct({ name: event.target.value })}
              value={draft.name}
            />
          </Field>
          <Field label="Slug">
            <input
              className="text-input"
              onChange={(event) => patchProduct({ slug: event.target.value })}
              value={draft.slug}
            />
          </Field>
          <Field label="Harga dasar">
            <input
              className="text-input"
              onChange={(event) =>
                patchProduct({ basePrice: Number(event.target.value) })
              }
              type="number"
              value={draft.basePrice}
            />
          </Field>
          <Field label="Status">
            <select
              className="select-input"
              onChange={(event) =>
                patchProduct({
                  status: event.target.value as Product["status"]
                })
              }
              value={draft.status}
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </Field>
        </div>

        <Field label="Deskripsi">
          <textarea
            className="textarea-input"
            onChange={(event) => patchProduct({ description: event.target.value })}
            value={draft.description ?? ""}
          />
        </Field>

        <section className="variant-editor">
          <div className="control-row" style={{ justifyContent: "space-between" }}>
            <h3 className="section-title">Harga Grosir</h3>
            <button className="secondary-button" onClick={addPriceTier} type="button">
              Tambah Tier
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Min</th>
                <th>Max</th>
                <th>Harga</th>
                <th>Quote</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(draft.priceTiers ?? []).map((tier) => (
                <tr key={tier.id}>
                  <td>
                    <input
                      className="text-input"
                      min={1}
                      onChange={(event) =>
                        patchPriceTier(tier.id, {
                          minQuantity: Number(event.target.value)
                        })
                      }
                      type="number"
                      value={tier.minQuantity}
                    />
                  </td>
                  <td>
                    <input
                      className="text-input"
                      min={tier.minQuantity}
                      onChange={(event) =>
                        patchPriceTier(tier.id, {
                          maxQuantity: readOptionalNumber(event.target.value)
                        })
                      }
                      placeholder="Tidak terbatas"
                      type="number"
                      value={tier.maxQuantity ?? ""}
                    />
                  </td>
                  <td>
                    <input
                      className="text-input"
                      min={0}
                      onChange={(event) =>
                        patchPriceTier(tier.id, {
                          unitPrice: readOptionalNumber(event.target.value)
                        })
                      }
                      type="number"
                      value={tier.unitPrice ?? ""}
                    />
                  </td>
                  <td>
                    <input
                      checked={tier.quoteRequired}
                      onChange={(event) =>
                        patchPriceTier(tier.id, {
                          quoteRequired: event.target.checked
                        })
                      }
                      type="checkbox"
                    />
                  </td>
                  <td>
                    <select
                      className="select-input"
                      onChange={(event) =>
                        patchPriceTier(tier.id, {
                          status: event.target.value as ProductPriceTier["status"]
                        })
                      }
                      value={tier.status}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="archived">archived</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="danger-button"
                      onClick={() => removePriceTier(tier.id)}
                      type="button"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="variant-editor">
          <h3 className="section-title">Minimum Order</h3>
          <div className="field-grid">
            <Field label="Minimum produk">
              <input
                className="text-input"
                min={1}
                onChange={(event) =>
                  patchMinimumRule({
                    minimumQuantity: Number(event.target.value)
                  })
                }
                type="number"
                value={draft.minimumRule?.minimumQuantity ?? 1}
              />
            </Field>
            <Field label="Minimum tier">
              <input
                className="text-input"
                min={1}
                onChange={(event) =>
                  patchMinimumRule({
                    minimumForTierQuantity: readOptionalNumber(event.target.value)
                  })
                }
                type="number"
                value={draft.minimumRule?.minimumForTierQuantity ?? ""}
              />
            </Field>
            <Field label="Quotation mulai">
              <input
                className="text-input"
                min={1}
                onChange={(event) =>
                  patchMinimumRule({
                    quotationQuantity: readOptionalNumber(event.target.value)
                  })
                }
                type="number"
                value={draft.minimumRule?.quotationQuantity ?? ""}
              />
            </Field>
            <Field label="Status rule">
              <select
                className="select-input"
                onChange={(event) =>
                  patchMinimumRule({
                    status: event.target.value as ProductMinimumRule["status"]
                  })
                }
                value={draft.minimumRule?.status ?? "active"}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="archived">archived</option>
              </select>
            </Field>
          </div>
        </section>

        <div className="control-row">
          <button className="secondary-button" onClick={addVariant} type="button">
            Tambah Warna
          </button>
          <button className="secondary-button" onClick={validateServer} type="button">
            Validasi Publish
          </button>
        </div>

        {draft.variants.map((variant) => (
          <article className="variant-editor" key={variant.id}>
            <div className="field-grid">
              <Field label="Warna">
                <input
                  className="text-input"
                  onChange={(event) =>
                    patchVariant(variant.id, { name: event.target.value })
                  }
                  value={variant.name}
                />
              </Field>
              <Field label="Slug warna">
                <input
                  className="text-input"
                  onChange={(event) =>
                    patchVariant(variant.id, { slug: event.target.value })
                  }
                  value={variant.slug}
                />
              </Field>
              <Field label="HEX">
                <input
                  className="text-input"
                  onChange={(event) =>
                    patchVariant(variant.id, { hexCode: event.target.value })
                  }
                  value={variant.hexCode}
                />
              </Field>
              <Field label="SKU varian">
                <input
                  className="text-input"
                  onChange={(event) =>
                    patchVariant(variant.id, { sku: event.target.value })
                  }
                  value={variant.sku}
                />
              </Field>
            </div>

            <div className="control-row">
              <label className="control-row">
                <input
                  checked={variant.isDefault}
                  onChange={(event) =>
                    patchVariant(variant.id, { isDefault: event.target.checked })
                  }
                  type="checkbox"
                />
                Default
              </label>
              <select
                className="select-input"
                onChange={(event) =>
                  patchVariant(variant.id, {
                    status: event.target.value as ProductVariant["status"]
                  })
                }
                style={{ maxWidth: 180 }}
                value={variant.status}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="out_of_stock">out_of_stock</option>
              </select>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Ukuran</th>
                  <th>Sellable SKU</th>
                  <th>Stok</th>
                  <th>Adj.</th>
                </tr>
              </thead>
              <tbody>
                {variant.sizes.map((variantSize) => (
                  <tr key={variantSize.id}>
                    <td>{variantSize.size.name}</td>
                    <td>
                      <input
                        className="text-input"
                        onChange={(event) =>
                          patchVariantSize(variant.id, variantSize.id, {
                            sku: event.target.value
                          })
                        }
                        value={variantSize.sku}
                      />
                    </td>
                    <td>
                      <input
                        className="text-input"
                        min={0}
                        onChange={(event) =>
                          patchVariantSize(variant.id, variantSize.id, {
                            stockQuantity: Number(event.target.value)
                          })
                        }
                        type="number"
                        value={variantSize.stockQuantity}
                      />
                    </td>
                    <td>
                      <input
                        className="text-input"
                        onChange={(event) =>
                          patchVariantSize(variant.id, variantSize.id, {
                            priceAdjustment: Number(event.target.value)
                          })
                        }
                        type="number"
                        value={variantSize.priceAdjustment}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}

        <section className="variant-editor">
          <div className="control-row" style={{ justifyContent: "space-between" }}>
            <h3 className="section-title">Service Catalog</h3>
            <button className="secondary-button" onClick={addService} type="button">
              Tambah Layanan
            </button>
          </div>
          {serviceDrafts.map((service) => (
            <article className="service-admin-row" key={service.id}>
              <div className="field-grid">
                <Field label="Nama layanan">
                  <input
                    className="text-input"
                    onChange={(event) =>
                      patchService(service.id, { name: event.target.value })
                    }
                    value={service.name}
                  />
                </Field>
                <Field label="Slug">
                  <input
                    className="text-input"
                    onChange={(event) =>
                      patchService(service.id, { slug: event.target.value })
                    }
                    value={service.slug}
                  />
                </Field>
                <Field label="Pricing">
                  <select
                    className="select-input"
                    onChange={(event) =>
                      patchService(service.id, {
                        pricingType: event.target.value as ServicePricingType
                      })
                    }
                    value={service.pricingType}
                  >
                    <option value="fixed_per_item">fixed_per_item</option>
                    <option value="fixed_per_order">fixed_per_order</option>
                    <option value="tiered">tiered</option>
                    <option value="estimated">estimated</option>
                    <option value="manual_quote">manual_quote</option>
                  </select>
                </Field>
                <Field label="Harga dasar">
                  <input
                    className="text-input"
                    min={0}
                    onChange={(event) =>
                      patchService(service.id, {
                        basePrice: Number(event.target.value)
                      })
                    }
                    type="number"
                    value={service.basePrice}
                  />
                </Field>
                <Field label="Estimasi min">
                  <input
                    className="text-input"
                    min={0}
                    onChange={(event) =>
                      patchService(service.id, {
                        estimatedMinPrice: readOptionalNumber(event.target.value)
                      })
                    }
                    type="number"
                    value={service.estimatedMinPrice ?? ""}
                  />
                </Field>
                <Field label="Estimasi max">
                  <input
                    className="text-input"
                    min={0}
                    onChange={(event) =>
                      patchService(service.id, {
                        estimatedMaxPrice: readOptionalNumber(event.target.value)
                      })
                    }
                    type="number"
                    value={service.estimatedMaxPrice ?? ""}
                  />
                </Field>
                <Field label="Minimum qty">
                  <input
                    className="text-input"
                    min={1}
                    onChange={(event) =>
                      patchService(service.id, {
                        minimumQuantity: Number(event.target.value)
                      })
                    }
                    type="number"
                    value={service.minimumQuantity}
                  />
                </Field>
                <Field label="Status">
                  <select
                    className="select-input"
                    onChange={(event) =>
                      patchService(service.id, {
                        status: event.target.value as CustomService["status"]
                      })
                    }
                    value={service.status}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="archived">archived</option>
                  </select>
                </Field>
              </div>
              <Field label="Deskripsi">
                <textarea
                  className="textarea-input compact"
                  onChange={(event) =>
                    patchService(service.id, { description: event.target.value })
                  }
                  value={service.description ?? ""}
                />
              </Field>
              <div className="control-row">
                <label className="control-row">
                  <input
                    checked={service.requiresUpload}
                    onChange={(event) =>
                      patchService(service.id, {
                        requiresUpload: event.target.checked
                      })
                    }
                    type="checkbox"
                  />
                  Wajib file
                </label>
                <label className="control-row">
                  <input
                    checked={service.requiresNotes}
                    onChange={(event) =>
                      patchService(service.id, {
                        requiresNotes: event.target.checked
                      })
                    }
                    type="checkbox"
                  />
                  Wajib catatan
                </label>
                <label className="control-row">
                  <input
                    checked={service.requiresReview}
                    onChange={(event) =>
                      patchService(service.id, {
                        requiresReview: event.target.checked
                      })
                    }
                    type="checkbox"
                  />
                  Wajib review
                </label>
                <label className="control-row">
                  <input
                    checked={service.isStackable}
                    onChange={(event) =>
                      patchService(service.id, {
                        isStackable: event.target.checked
                      })
                    }
                    type="checkbox"
                  />
                  Stackable
                </label>
                <input
                  className="text-input"
                  onChange={(event) =>
                    patchService(service.id, {
                      allowedFileTypes: event.target.value
                        .split(",")
                        .map((item) => item.trim().toLowerCase())
                        .filter(Boolean)
                    })
                  }
                  placeholder="png,jpg,pdf"
                  style={{ maxWidth: 220 }}
                  value={service.allowedFileTypes.join(",")}
                />
                <input
                  className="text-input"
                  onChange={(event) =>
                    patchService(service.id, {
                      exclusiveGroup: event.target.value || null
                    })
                  }
                  placeholder="Exclusive group"
                  style={{ maxWidth: 220 }}
                  value={service.exclusiveGroup ?? ""}
                />
              </div>
            </article>
          ))}
          <button className="secondary-button" onClick={saveServices} type="button">
            Simpan Layanan
          </button>
        </section>

        <Field label="Admin token">
          <input
            className="text-input"
            onChange={(event) => setToken(event.target.value)}
            type="password"
            value={token}
          />
        </Field>

        <div className="control-row">
          <button className="primary-button" onClick={saveDraft} type="button">
            Simpan PIM V2
          </button>
          {status ? <span className="muted">{status}</span> : null}
        </div>

        {issues.length > 0 ? (
          <div className="notice danger">
            {issues.map((issue) => (
              <p key={`${issue.field}-${issue.message}`}>
                {issue.field}: {issue.message}
              </p>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function cloneProduct(product: Product): Product {
  return JSON.parse(JSON.stringify(product)) as Product;
}

function cloneServices(services: CustomService[]): CustomService[] {
  return JSON.parse(JSON.stringify(services)) as CustomService[];
}

function readOptionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
