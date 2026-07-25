import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const temporaryPassword = process.env.DEBRODER_ADMIN_BOOTSTRAP_PASSWORD;

if (!url || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib tersedia.");
}
if (!temporaryPassword || temporaryPassword.length < 12) {
  throw new Error("DEBRODER_ADMIN_BOOTSTRAP_PASSWORD minimal 12 karakter.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const PROTECTED_EMAIL = "fahmi@debroder.com";
const normalizeStoreName = (value) => String(value ?? "")
  .trim()
  .toUpperCase()
  .replace(/^STORE\s+/, "")
  .replace(/\s+/g, " ");

const { data: stores, error: storesError } = await supabase
  .from("stores")
  .select("id,nama_store")
  .eq("status_aktif", true);
if (storesError) throw storesError;

const storeByName = new Map(
  (stores ?? []).map((store) => [normalizeStoreName(store.nama_store), store.id])
);
function requiredStoreId(name) {
  const id = storeByName.get(normalizeStoreName(name));
  if (!id) throw new Error(`Store aktif tidak ditemukan: ${name}`);
  return id;
}

const accounts = [
  {
    email: "owner@debroder.com",
    displayName: "Owner",
    role: "owner",
    primaryStoreId: null,
    allStoreAccess: true
  },
  {
    email: "head-store@debroder.com",
    displayName: "Head Store",
    role: "head_store",
    primaryStoreId: requiredStoreId("Pettarani"),
    allStoreAccess: true
  },
  {
    email: "store-admin-landak@debroder.com",
    displayName: "Store Admin Landak",
    role: "store_admin",
    primaryStoreId: requiredStoreId("Landak"),
    allStoreAccess: false
  },
  {
    email: "store-admin-tello@debroder.com",
    displayName: "Store Admin Tello",
    role: "store_admin",
    primaryStoreId: requiredStoreId("Tello"),
    allStoreAccess: false
  },
  {
    email: "store-admin-parepare@debroder.com",
    displayName: "Store Admin Parepare",
    role: "store_admin",
    primaryStoreId: requiredStoreId("Parepare"),
    allStoreAccess: false
  },
  {
    email: "product-content-manager@debroder.com",
    displayName: "Product & Content Manager",
    role: "product_content_manager",
    primaryStoreId: null,
    allStoreAccess: true
  },
  {
    email: "order-cs-admin@debroder.com",
    displayName: "Order & Customer Service Admin",
    role: "order_cs_admin",
    primaryStoreId: null,
    allStoreAccess: true
  },
  {
    email: "finance-admin@debroder.com",
    displayName: "Finance Admin",
    role: "finance_admin",
    primaryStoreId: null,
    allStoreAccess: true
  }
].map((account) => ({ ...account, accountStatus: "TESTING" }));

if (accounts.length !== 8 || new Set(accounts.map((account) => account.email)).size !== 8) {
  throw new Error("Safety check: daftar bootstrap wajib tepat delapan akun unik.");
}
if (accounts.some((account) => account.email.toLowerCase() === PROTECTED_EMAIL)) {
  throw new Error(`Safety check: ${PROTECTED_EMAIL} tidak boleh menjadi target bootstrap.`);
}
if (accounts.some((account) => /viewer/i.test(account.role))) {
  throw new Error("Safety check: role Viewer tidak boleh dibuat.");
}

const { data: existingData, error: existingError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000
});
if (existingError) throw existingError;

const existingByEmail = new Map(
  existingData.users
    .filter((user) => typeof user.email === "string")
    .map((user) => [user.email.toLowerCase(), user])
);

const protectedUserBefore = existingByEmail.get(PROTECTED_EMAIL);
if (!protectedUserBefore) {
  throw new Error(`Safety check: ${PROTECTED_EMAIL} tidak ditemukan sebelum bootstrap.`);
}

const duplicateTargets = accounts
  .filter((account) => existingByEmail.has(account.email.toLowerCase()))
  .map((account) => account.email);
if (duplicateTargets.length > 0) {
  throw new Error(`Bootstrap dihentikan. Akun target sudah ada: ${duplicateTargets.join(", ")}`);
}

const { data: protectedProfileBefore, error: protectedProfileError } = await supabase
  .from("profiles")
  .select("id,email,role,created_at,updated_at")
  .eq("id", protectedUserBefore.id)
  .single();
if (protectedProfileError) throw protectedProfileError;
if (protectedProfileBefore.role !== "superadmin") {
  throw new Error(`Safety check: ${PROTECTED_EMAIL} bukan superadmin sebelum bootstrap.`);
}

const createdUserIds = [];
const result = [];

try {
  for (const account of accounts) {
    const createResult = await supabase.auth.admin.createUser({
      email: account.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { display_name: account.displayName },
      app_metadata: {
        role: account.role,
        debroder_admin_role: account.role,
        debroder_account_status: account.accountStatus
      }
    });
    if (createResult.error || !createResult.data.user) {
      throw createResult.error || new Error(`Gagal membuat ${account.email}`);
    }

    const user = createResult.data.user;
    createdUserIds.push(user.id);

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      email: account.email,
      display_name: account.displayName,
      role: account.role,
      account_status: account.accountStatus,
      primary_store_id: account.primaryStoreId,
      all_store_access: account.allStoreAccess,
      active_session_id: null,
      session_version: 0,
      lifecycle_reason: "Bootstrap akun ADMIN-RBAC-01 dalam status TESTING",
      updated_at: new Date().toISOString()
    });
    if (profileError) throw profileError;

    const { error: auditError } = await supabase.from("system_audit_log").insert({
      entity_type: "admin_profile",
      entity_id: user.id,
      action: "ADMIN_ACCOUNT_BOOTSTRAPPED",
      old_value: null,
      new_value: {
        email: account.email,
        display_name: account.displayName,
        role: account.role,
        account_status: account.accountStatus,
        primary_store_id: account.primaryStoreId,
        all_store_access: account.allStoreAccess
      },
      actor_id: null,
      actor_role: "service_role",
      source: "admin-rbac-bootstrap",
      reason: "Owner-approved ADMIN-RBAC-01 account bootstrap",
      metadata: { checkpoint: "ADMIN-RBAC-01", password_stored_in_audit: false }
    });
    if (auditError) throw auditError;

    result.push({
      email: account.email,
      role: account.role,
      status: account.accountStatus,
      primaryStoreId: account.primaryStoreId,
      allStoreAccess: account.allStoreAccess,
      created: true
    });
  }

  const { data: finalUsers, error: finalUsersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  if (finalUsersError) throw finalUsersError;

  const protectedUserAfter = finalUsers.users.find(
    (user) => user.email?.toLowerCase() === PROTECTED_EMAIL
  );
  if (!protectedUserAfter || protectedUserAfter.id !== protectedUserBefore.id) {
    throw new Error(`Safety check gagal: identitas ${PROTECTED_EMAIL} berubah atau hilang.`);
  }

  const { data: protectedProfileAfter, error: protectedProfileAfterError } = await supabase
    .from("profiles")
    .select("id,email,role,created_at,updated_at")
    .eq("id", protectedUserAfter.id)
    .single();
  if (protectedProfileAfterError) throw protectedProfileAfterError;
  if (JSON.stringify(protectedProfileAfter) !== JSON.stringify(protectedProfileBefore)) {
    throw new Error(`Safety check gagal: profil ${PROTECTED_EMAIL} berubah selama bootstrap.`);
  }

  const targetIds = createdUserIds;
  const { data: createdProfiles, error: createdProfilesError } = await supabase
    .from("profiles")
    .select("id,email,role,account_status,primary_store_id,all_store_access")
    .in("id", targetIds);
  if (createdProfilesError) throw createdProfilesError;
  if ((createdProfiles ?? []).length !== accounts.length) {
    throw new Error("Verifikasi gagal: jumlah profil baru tidak tepat delapan.");
  }
  if ((createdProfiles ?? []).some((profile) => profile.account_status !== "TESTING")) {
    throw new Error("Verifikasi gagal: seluruh akun baru wajib berstatus TESTING.");
  }
} catch (error) {
  for (const userId of createdUserIds.reverse()) {
    const cleanup = await supabase.auth.admin.deleteUser(userId);
    if (cleanup.error) {
      console.error("Rollback akun gagal", { userId, message: cleanup.error.message });
    }
  }
  throw error;
}

console.table(result);
console.log(
  "Bootstrap selesai: delapan akun baru dibuat sebagai TESTING. " +
  `${PROTECTED_EMAIL} tetap superadmin dan tidak disentuh.`
);
