# DEBRODER v1.2 Phase 8 — Work Item

Status: source package prepared from Phase 7 base and Phase 8 live database foundation.

## Scope

- Work Item list and detail pages.
- Generate Work Item from Job Order.
- Create manual Work Item.
- Edit draft/ready Work Item with revision history.
- Assign responsible staff with assignment history.
- Add/remove dependencies with cycle protection.
- Preparation status transitions: Draft, Ready, Cancelled.
- Archive, restore, and Super Admin permanent delete.
- Work Item appears in admin navigation and Job Order detail.
- Job Order can release only after Work Items pass the database gate.

## Database status

The Phase 8 migrations were applied to the connected production database before this source package was created. The SQL files in this package are included so repository source history matches the live database. Do not paste these SQL files manually into SQL Editor.

## Intentional boundary

Phase 8 stops at Work Item preparation and release gate. Full production movement after release belongs to Phase 9.

## Quality note

A database core lifecycle probe passed on the connected database. Local full dependency-based checks require the normal project install on the user's machine or Vercel build environment.
