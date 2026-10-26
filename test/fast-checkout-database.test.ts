import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Real isolated PostgreSQL execution of the new migration. Canonical legacy
// RPCs are fixture stubs: this does NOT validate staging inventory/fulfillment.
let db: PGlite;
const order = "11111111-1111-4111-8111-111111111111";
const fixture = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
create table products(id uuid primary key,name text,base_price bigint,status text default 'active',status_aktif boolean default true);
create table product_variants(id uuid primary key,product_id uuid,name text,price_adjustment bigint default 0,status text default 'active',is_active boolean default true);
create table product_variant_sizes(id uuid primary key,variant_id uuid,price_adjustment bigint default 0,status text default 'active',is_active boolean default true);
create table product_price_tiers(product_id uuid,unit_price bigint,quote_required boolean,min_quantity integer,max_quantity integer,status text);
create table profiles(id uuid primary key,role text,account_status text,all_store_access boolean);
create table orders(id uuid primary key default gen_random_uuid(),public_idempotency_key text unique,public_access_token_hash text,order_number text,
  pricing_status text default 'final',total_amount bigint,subtotal_amount bigint,payment_effective_total bigint default 0,archived_at timestamptz,status text,
  final_total_approved_at timestamptz,shipping_cost bigint,shipping_courier text,shipping_service text,shipping_estimate text,shipping_quoted_at timestamptz,
  payment_required_amount bigint,payment_balance bigint,source_snapshot jsonb default '{}',payment_status text default 'unpaid',payment_production_eligible boolean default false);
create table stock_reservations(order_id uuid primary key,status text,expires_at timestamptz);
create table order_shipping_quotes(order_id uuid,version integer,courier text,service text,cost bigint,estimate text,subtotal_snapshot bigint,total_snapshot bigint,status text,approved_at timestamptz);
create table system_audit_log(entity_type text,entity_id uuid,action text,actor_id uuid,actor_role text,source text,new_value jsonb);
create table order_payments(id uuid primary key,order_id uuid,amount bigint,method text,channel_name text,reference_number text,status text,
  review_outcome text,verified_amount bigint,verified_at timestamptz,verified_by uuid,reviewed_at timestamptz,reviewed_by uuid,
  verified_transaction_at timestamptz,verified_reference text unique,verified_destination_account text,submission_source text,
  check_funds_received boolean,check_destination_account boolean,check_amount boolean,check_transaction_time boolean,check_reference_unique boolean);
create function guard_verified_payment_evidence_v1() returns trigger language plpgsql as $$begin return new;end$$;
create trigger guard_verified_payment_evidence_v1 before insert or update of status on order_payments for each row execute function guard_verified_payment_evidence_v1();
create table refresh_witness(order_id uuid);
create function refresh_order_payment_summary(p_order_id uuid) returns void language plpgsql as $$begin
  insert into public.refresh_witness values(p_order_id);
  update public.orders set payment_effective_total=(select coalesce(sum(verified_amount),0) from public.order_payments where order_id=p_order_id and status='verified'),
    payment_status=case when exists(select 1 from public.order_payments where order_id=p_order_id and status='verified') then 'paid' else 'unpaid' end where id=p_order_id;
end$$;
create function reserve_public_order_stock(p_id uuid,p_duration interval,p_customer uuid) returns void language plpgsql as $$begin
  insert into public.stock_reservations values(p_id,'active',now()+p_duration) on conflict(order_id) do nothing;
end$$;
create function activate_public_checkout_order_v2(p_id uuid,p_customer uuid,p_source text) returns jsonb language sql as $$select '{}'::jsonb$$;
create function is_verified_registered_customer_checkout_v1(p_id uuid,p_email text) returns boolean language sql as $$select false$$;
create function create_public_checkout_order(p_key text,p_hash text,p_legacy text,p_name text,p_phone text,p_email text,p_method text,p_address text,p_pickup uuid,p_payment text,p_notes text,p_items jsonb)
returns jsonb language plpgsql as $$declare o public.orders;begin
  insert into public.orders(public_idempotency_key,public_access_token_hash,order_number,total_amount,subtotal_amount,status)
    values(p_key,p_hash,'TEST',100,100,'pending_confirmation') returning * into o;
  return jsonb_build_object('order_id',o.id,'order_number',o.order_number);
end$$;
set request.jwt.claim.role='service_role';
`;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(fixture);
  await db.exec(
    readFileSync(
      "supabase/migrations/20261026045918_fast_checkout_midtrans_rajaongkir_v1.sql",
      "utf8",
    ),
  );
  await db.exec(`update fast_checkout_settings set payment_enabled=true`);
  await db.query(
    `insert into orders(id,order_number,total_amount,subtotal_amount,status,final_total_approved_at) values($1,'TEST-PAY',100,100,'awaiting_payment',now())`,
    [order],
  );
  await db.query(
    `insert into public.stock_reservations values($1,'active',now()+interval '1 day');`,
    [order],
  );
  await db.query(
    `insert into fast_checkout_sessions(order_id,request_key,request_hash,shipping_snapshot) values($1,'test-existing-key','hash','{}')`,
    [order],
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function scalar(sql: string, args: unknown[] = []) {
  return (await db.query<{ value: unknown }>(sql, args)).rows[0].value;
}
describe.sequential(
  "Fast Checkout migration — LOCAL POSTGRES (legacy stubs)",
  () => {
    it("denies anonymous/authenticated gateway table and function access", async () => {
      expect(
        await scalar(
          `select has_table_privilege('anon','fast_payment_attempts','select') as value`,
        ),
      ).toBe(false);
      expect(
        await scalar(
          `select has_function_privilege('authenticated','fast_payment_apply_v1(text,text,text,bigint,text,text)','execute') as value`,
        ),
      ).toBe(false);
      await db.exec(`set request.jwt.claim.role='anon'`);
      await expect(
        db.query(`select fast_payment_claim_v1($1,'merchant')`, [order]),
      ).rejects.toThrow("FAST_ACCESS_DENIED");
      await db.exec(`set request.jwt.claim.role='service_role'`);
    });
    it("claims one provider attempt under repeated calls", async () => {
      const a = (await scalar(
        `select fast_payment_claim_v1($1,'merchant') as value`,
        [order],
      )) as { claimed: boolean; provider_order_id: string };
      const b = (await scalar(
        `select fast_payment_claim_v1($1,'merchant') as value`,
        [order],
      )) as typeof a;
      expect(a.claimed).toBe(true);
      expect(b.claimed).toBe(false);
      expect(b.provider_order_id).toBe(a.provider_order_id);
      expect(
        await scalar(
          `select count(*)::integer as value from fast_payment_attempts`,
        ),
      ).toBe(1);
    });
    it("rejects amount and merchant mismatches without a ledger entry", async () => {
      const id = await scalar(
        `select provider_order_id as value from fast_payment_attempts`,
      );
      for (const [amount, merchant] of [
        [101, "merchant"],
        [100, "attacker"],
      ])
        await expect(
          db.query(`select fast_payment_apply_v1($1,'txn',$2,$3,'paid',$4)`, [
            id,
            merchant,
            amount,
            "a".repeat(64),
          ]),
        ).rejects.toThrow("FAST_NOTIFICATION_MISMATCH");
      expect(
        await scalar(`select count(*)::integer as value from order_payments`),
      ).toBe(0);
    });
    it("settles once, rejects regression, and keeps the same order", async () => {
      const id = await scalar(
        `select provider_order_id as value from fast_payment_attempts`,
      );
      await db.query(
        `select fast_payment_apply_v1($1,'txn','merchant',100,'paid',$2)`,
        [id, "a".repeat(64)],
      );
      await db.query(
        `select fast_payment_apply_v1($1,'txn','merchant',100,'paid',$2)`,
        [id, "a".repeat(64)],
      );
      await db.query(
        `select fast_payment_apply_v1($1,'txn','merchant',100,'pending',$2)`,
        [id, "b".repeat(64)],
      );
      expect(
        await scalar(`select count(*)::integer as value from order_payments`),
      ).toBe(1);
      expect(
        await scalar(`select count(*)::integer as value from refresh_witness`),
      ).toBe(1);
      expect(
        await scalar(`select payment_status as value from orders where id=$1`, [
          order,
        ]),
      ).toBe("paid");
      await expect(
        db.query(`select fast_payment_claim_v1($1,'merchant')`, [order]),
      ).rejects.toThrow("FAST_ORDER_NOT_PAYABLE");
    });
    it("preserves manual verification guard requirements", async () => {
      await expect(
        db.query(
          `insert into order_payments(id,order_id,amount,status,review_outcome) values(gen_random_uuid(),$1,100,'verified','verified')`,
          [order],
        ),
      ).rejects.toThrow("Pembayaran terverifikasi");
    });
    it("applies full refund once without repeating the settlement", async () => {
      const id = await scalar(
        `select provider_order_id as value from fast_payment_attempts`,
      );
      await db.query(
        `select fast_payment_apply_v1($1,'txn','merchant',100,'refunded',$2)`,
        [id, "c".repeat(64)],
      );
      await db.query(
        `select fast_payment_apply_v1($1,'txn','merchant',100,'refunded',$2)`,
        [id, "c".repeat(64)],
      );
      expect(
        await scalar(`select payment_status as value from orders where id=$1`, [
          order,
        ]),
      ).toBe("refunded");
      expect(
        await scalar(`select count(*)::integer as value from refresh_witness`),
      ).toBe(2);
    });
    it("applies a persistent shared rate limit", async () => {
      const key = "d".repeat(64);
      expect(
        await scalar(`select fast_checkout_limit_v1($1,1) as value`, [key]),
      ).toBe(true);
      expect(
        await scalar(`select fast_checkout_limit_v1($1,1) as value`, [key]),
      ).toBe(false);
    });
    it("rejects stale shipping quotes before creating an order", async () => {
      const product = "22222222-2222-4222-8222-222222222222",
        variant = "33333333-3333-4333-8333-333333333333",
        size = "44444444-4444-4444-8444-444444444444";
      await db.query(
        `insert into products(id,name,base_price,shipping_weight_grams,shipping_length_cm,shipping_width_cm,shipping_height_cm) values($1,'Test',100,200,20,10,2)`,
        [product],
      );
      await db.query(
        `insert into product_variants(id,product_id) values($1,$2)`,
        [variant, product],
      );
      await db.query(
        `insert into product_variant_sizes(id,variant_id) values($1,$2)`,
        [size, variant],
      );
      await db.exec(
        `update fast_checkout_settings set payment_enabled=true,origin_id=1,couriers=array['jne']`,
      );
      const input = {
        idempotencyKey: "test-new-order-key",
        items: [{ variantSizeId: size, quantity: 1 }],
        fulfillment: "shipping",
        addressDetail: "Jl Test",
      };
      await expect(
        db.query(`select fast_checkout_create_v1($1,$2,$3,$4,null)`, [
          JSON.stringify(input),
          JSON.stringify({ expiresAt: 1 }),
          "a".repeat(64),
          "b".repeat(64),
        ]),
      ).rejects.toThrow("FAST_QUOTE_INVALID");
      expect(
        await scalar(`select count(*)::integer as value from orders`),
      ).toBe(1);
    });
    it("creates and finalizes one order for the same checkout key", async () => {
      const settingsVersion = await scalar(
        `select updated_at::text as value from fast_checkout_settings`,
      );
      const input = {
        idempotencyKey: "test-valid-shipping-key",
        customer: {
          name: "Test",
          phone: "08123456789",
          email: "test@example.com",
        },
        items: [
          {
            variantSizeId: "44444444-4444-4444-8444-444444444444",
            quantity: 1,
          },
        ],
        fulfillment: "shipping",
        addressDetail: "Jl Test No 1",
      };
      const quote = {
        expiresAt: Date.now() + 300000,
        settingsVersion,
        origin: 1,
        subtotal: 100,
        weight: 200,
        dimensions: { length: 20, width: 10, height: 2 },
        rate: { code: "jne", service: "REG", cost: 10, etd: "2-3 day" },
        destination: { label: "Dago, Bandung" },
      };
      const args = [
        JSON.stringify(input),
        JSON.stringify(quote),
        "e".repeat(64),
        "f".repeat(64),
      ];
      const a = (await scalar(
        `select fast_checkout_create_v1($1,$2,$3,$4,null) as value`,
        args,
      )) as { order_id: string; total: number };
      const b = await scalar(
        `select fast_checkout_create_v1($1,$2,$3,$4,null) as value`,
        args,
      );
      expect(b).toEqual(a);
      expect(a.total).toBe(110);
      expect(
        await scalar(`select count(*)::integer as value from orders`),
      ).toBe(2);
      expect(
        await scalar(
          `select count(*)::integer as value from order_shipping_quotes`,
        ),
      ).toBe(1);
      expect(
        await scalar(`select status as value from orders where id=$1`, [
          a.order_id,
        ]),
      ).toBe("awaiting_payment");
      await expect(
        db.query(`select fast_checkout_create_v1($1,$2,$3,$4,null)`, [
          args[0],
          args[1],
          "0".repeat(64),
          args[3],
        ]),
      ).rejects.toThrow("FAST_IDEMPOTENCY_CONFLICT");
    });
    it("links two attempts to one order and holds a second late settlement for review", async () => {
      const id = "55555555-5555-4555-8555-555555555555";
      await db.query(
        `insert into orders(id,order_number,total_amount,subtotal_amount,status,final_total_approved_at) values($1,'TEST-RETRY',100,100,'awaiting_payment',now())`,
        [id],
      );
      await db.query(
        `insert into stock_reservations values($1,'active',now()+interval '1 day')`,
        [id],
      );
      await db.query(
        `insert into fast_checkout_sessions(order_id,request_key,request_hash,shipping_snapshot) values($1,'retry-key','hash','{}')`,
        [id],
      );
      const first = (await scalar(
        `select fast_payment_claim_v1($1,'merchant') as value`,
        [id],
      )) as { provider_order_id: string };
      await db.query(
        `select fast_payment_apply_v1($1,'old-txn','merchant',100,'expire',$2)`,
        [first.provider_order_id, "1".repeat(64)],
      );
      const second = (await scalar(
        `select fast_payment_claim_v1($1,'merchant') as value`,
        [id],
      )) as { provider_order_id: string };
      expect(second.provider_order_id).not.toBe(first.provider_order_id);
      await db.query(
        `select fast_payment_apply_v1($1,'old-txn','merchant',100,'paid',$2)`,
        [first.provider_order_id, "2".repeat(64)],
      );
      const result = await scalar(
        `select fast_payment_apply_v1($1,'new-txn','merchant',100,'paid',$2) as value`,
        [second.provider_order_id, "3".repeat(64)],
      );
      expect(result).toEqual({ review_required: true });
      expect(
        await scalar(
          `select count(*)::integer as value from order_payments where order_id=$1`,
          [id],
        ),
      ).toBe(1);
      expect(
        await scalar(
          `select count(*)::integer as value from fast_payment_attempts where order_id=$1`,
          [id],
        ),
      ).toBe(2);
    });
  },
);
