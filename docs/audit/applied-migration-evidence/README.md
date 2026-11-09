# Applied migration SQL — read-only forensic archive

**Captured on 2026-11-09 from Supabase staging `ykfjgnrigcsapblbxnxb`.**
**DO NOT EXECUTE / DO NOT MOVE INTO `supabase/migrations` WITHOUT A SEPARATE REVIEW.**

This folder contains unmodified SQL copied from the `statements[1]` column of the applied `supabase_migrations.schema_migrations` records. These files are deliberately named `.sql.txt` and stored outside the executable migrations directory. The corresponding database changes were **already applied historically** to staging; re-running them could overwrite functions or fail a guard.

| Applied version | Migration | SQL length | Source MD5 |
| --- | --- | ---: | --- |
| `20261020163915` | `p0_regular_checkout_recovery_v1` | 7,901 | `02d1342a0a7c11c9f8e44a348db0d3bd` |
| `20261021041852` | `p0_instant_checkout_lock_v1` | 5,348 | `58f33a5b1c3f59597842b4f56cf1fe01` |

Both archived GitHub file contents were fetched after committing and **exactly matched** the recorded `statements[1]` text on staging.

Two other remote-only timestamp keys (`20260819144305` and `20260819144442`) have local counterparts (`20260819144205` and `20260819144405`) with the **same normalized SQL content**, including line ending normalization. Those files are intentionally not copied here to avoid duplicating existing logic.

This recovery is evidence of SQL text provenance, **not** proof that staging's current function definitions are byte-for-byte identical to any historical migration or that all 22 related business triggers accept the Fast Checkout candidate.

Never use this archive to manipulate the applied history, `supabase migration repair`, or `db push` automatically. The current candidate is still marked DO NOT RUN.
