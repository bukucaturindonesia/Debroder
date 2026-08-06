import { z } from "zod";

const customerName = z.string().trim().min(2, "Nama minimal 2 karakter.").max(150, "Nama terlalu panjang.");
const email = z.string().trim().toLowerCase().email("Email tidak valid.").max(254, "Email terlalu panjang.");
const phone = z.string().trim().transform((value) => value.replace(/\D/g, "")).refine(
  (value) => value.length === 0 || (value.length >= 9 && value.length <= 15),
  "Nomor telepon tidak valid."
);
const password = z.string()
  .min(10, "Kata sandi minimal 10 karakter.")
  .max(72, "Kata sandi terlalu panjang.")
  .regex(/[a-z]/, "Kata sandi harus memiliki huruf kecil.")
  .regex(/[A-Z]/, "Kata sandi harus memiliki huruf besar.")
  .regex(/[0-9]/, "Kata sandi harus memiliki angka.");

export const customerRegistrationSchema = z.object({
  fullName: customerName,
  email,
  password,
  acceptedTerms: z.boolean().refine((value) => value, "Persetujuan syarat dan kebijakan privasi wajib dicentang.")
});

export const customerLoginSchema = z.object({
  email,
  password: z.string().min(1, "Kata sandi wajib diisi.").max(72, "Kata sandi terlalu panjang.")
});

export const customerPasswordSchema = z.object({
  password,
  confirmation: z.string()
}).superRefine((value, context) => {
  if (value.password !== value.confirmation) {
    context.addIssue({
      code: "custom",
      path: ["confirmation"],
      message: "Konfirmasi kata sandi tidak sama."
    });
  }
});

export const customerProfileUpdateSchema = z.object({
  fullName: customerName,
  phone
});

export const customerRecoverySchema = z.object({ email });

export const customerAddressSchema = z.object({
  label: z.string().trim().min(2, "Label alamat minimal 2 karakter.").max(60, "Label alamat terlalu panjang."),
  isDefault: z.boolean().default(false),
  formattedAddress: z.string().trim().min(10, "Ringkasan alamat belum lengkap.").max(1200, "Ringkasan alamat terlalu panjang."),
  address: z.object({
    recipientName: customerName,
    recipientPhone: z.string().trim().transform((value) => value.replace(/\D/g, "")).refine(
      (value) => value.length >= 9 && value.length <= 15,
      "Nomor penerima tidak valid."
    ),
    provinceId: z.string().trim().regex(/^[0-9A-Za-z.-]{1,24}$/, "Provinsi tidak valid."),
    regencyId: z.string().trim().regex(/^[0-9A-Za-z.-]{1,24}$/, "Kabupaten/kota tidak valid."),
    districtId: z.string().trim().regex(/^[0-9A-Za-z.-]{1,24}$/, "Kecamatan tidak valid."),
    villageId: z.string().trim().regex(/^[0-9A-Za-z.-]{1,24}$/, "Kelurahan/desa tidak valid."),
    postalCode: z.string().trim().regex(/^\d{5}$/, "Kode pos harus 5 angka."),
    addressDetail: z.string().trim().min(5, "Rincian alamat minimal 5 karakter.").max(500, "Rincian alamat terlalu panjang."),
    houseNumber: z.string().trim().max(80).default(""),
    rt: z.string().trim().regex(/^\d{0,3}$/, "RT tidak valid.").default(""),
    rw: z.string().trim().regex(/^\d{0,3}$/, "RW tidak valid.").default(""),
    landmark: z.string().trim().max(300).default(""),
    courierNote: z.string().trim().max(500).default("")
  })
});

export type CustomerProfile = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  accountStatus: "ACTIVE" | "SUSPENDED" | "CLOSED";
  emailVerifiedAt: string;
};

export type CustomerAddress = {
  id: string;
  label: string;
  isDefault: boolean;
  formattedAddress: string;
  address: {
    recipientName: string;
    recipientPhone: string;
    provinceId: string;
    regencyId: string;
    districtId: string;
    villageId: string;
    postalCode: string;
    addressDetail: string;
    houseNumber: string;
    rt: string;
    rw: string;
    landmark: string;
    courierNote: string;
  };
};
