# Disaster Recovery + Backup Procedure (Phase 15.25)

## Objectives
- RPO: 1 hour
- RTO: 4 hours

## Backup Scope
- PostgreSQL primary database.
- Redis persistence snapshots (if enabled).
- Object storage assets (uploads/exports).
- Critical configuration secrets (vault-backed, encrypted).

## Backup Schedule
- DB full backup: daily.
- DB WAL/incremental: every 15 minutes.
- Object storage replication: near real-time cross-region.
- Config snapshots: daily.

## Restore Procedure
1. Provision clean target environment.
2. Restore latest DB full backup.
3. Replay WAL/incrementals to target recovery point.
4. Reattach object storage bucket snapshot.
5. Restore secrets/config.
6. Run integrity checks:
   - row counts by major table
   - auth/login flow
   - chat send/receive
   - widget init

## Disaster Drill (Quarterly)
- Run full restore in staging from production backups.
- Record timings, blockers, and integrity check results.
- Publish corrective actions with owners and deadlines.

## Communication
- Open status incident immediately for customer-visible events.
- Update at least every 30 minutes during active Sev-1 recovery.
