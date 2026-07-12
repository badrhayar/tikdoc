#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# Tabibo · Manual backup (database + Storage files)
#
#   Free-plan safety net: dumps the whole Postgres database AND downloads every
#   file from all Storage buckets into one timestamped folder, then keeps only
#   the newest N backups (rotation). No paid plan required.
#
#   USAGE
#     1. cp scripts/.env.example scripts/.env   and fill in the 3 values
#     2. ./scripts/backup.sh
#
#   Restore later:
#     • database  →  gunzip -c backups/<stamp>/db.sql.gz | psql "$SUPABASE_DB_URL"
#     • files     →  re-upload backups/<stamp>/storage/<bucket>/… via the
#                    dashboard or the Storage API (they are plain files on disk)
#
#   Requires: bash, pg_dump (v15+), curl, jq, gzip — all standard.
# ════════════════════════════════════════════════════════════════════════════
set -uo pipefail

# ── Resolve paths ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Load config (scripts/.env is git-ignored; env vars also work) ────────────
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a; . "$SCRIPT_DIR/.env"; set +a
fi

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Settings → Database → Connection string → URI)}"
: "${SUPABASE_URL:?Set SUPABASE_URL (e.g. https://xxxx.supabase.co)}"
: "${SUPABASE_SERVICE_KEY:?Set SUPABASE_SERVICE_KEY (Settings → API → service_role secret)}"

BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
RETENTION="${RETENTION:-7}"                     # how many backups to keep
BUCKETS=(${BUCKETS:-documents avatars credentials chat-media})
SUPABASE_URL="${SUPABASE_URL%/}"                # strip trailing slash

# ── Preconditions ────────────────────────────────────────────────────────────
for bin in pg_dump curl jq gzip; do
  command -v "$bin" >/dev/null 2>&1 || { echo "✗ '$bin' introuvable — installez-le d'abord." >&2; exit 1; }
done

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_DIR/tabibo-$STAMP"
mkdir -p "$DEST"
echo "▶ Sauvegarde Tabibo → $DEST"

# ── 1) Database dump ─────────────────────────────────────────────────────────
echo "  • base de données…"
if pg_dump "$SUPABASE_DB_URL" \
      --clean --if-exists --no-owner --no-privileges \
      --quote-all-identifiers 2>"$DEST/db.pg_dump.log" \
      | gzip -9 > "$DEST/db.sql.gz"; then
  db_size="$(du -h "$DEST/db.sql.gz" | cut -f1)"
  echo "    ✓ db.sql.gz ($db_size)"
  rm -f "$DEST/db.pg_dump.log"
else
  echo "    ✗ Échec du dump — voir $DEST/db.pg_dump.log" >&2
  echo "      (La sauvegarde des fichiers continue quand même.)" >&2
fi

# ── 2) Storage files ─────────────────────────────────────────────────────────
# URL-encode a path segment-by-segment (keeps the '/' separators intact).
encode_path() {
  local p="$1" out="" seg; local IFS='/'
  for seg in $p; do
    [[ -z "$seg" ]] && continue
    out+="/$(jq -rn --arg s "$seg" '$s|@uri')"
  done
  printf '%s' "${out#/}"
}

# Recursively walk a bucket: list a prefix, download files, recurse into folders.
FILE_COUNT=0
walk_prefix() {
  local bucket="$1" prefix="$2" offset=0 batch
  while :; do
    batch="$(curl -fsS -X POST "$SUPABASE_URL/storage/v1/object/list/$bucket" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"prefix\":\"$prefix\",\"limit\":1000,\"offset\":$offset,\"sortBy\":{\"column\":\"name\",\"order\":\"asc\"}}" 2>/dev/null)" || return 1
    # Non-array (error object) or empty → stop.
    jq -e 'type=="array"' <<<"$batch" >/dev/null 2>&1 || return 1
    local n; n="$(jq 'length' <<<"$batch")"
    [[ "$n" -eq 0 ]] && break

    local i name id full
    for ((i=0; i<n; i++)); do
      name="$(jq -r ".[$i].name" <<<"$batch")"
      id="$(jq -r ".[$i].id" <<<"$batch")"
      full="${prefix}${name}"
      if [[ "$id" == "null" ]]; then
        walk_prefix "$bucket" "${full}/"          # folder → recurse
      else
        local dest="$DEST/storage/$bucket/$full"
        mkdir -p "$(dirname "$dest")"
        if curl -fsS -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
             "$SUPABASE_URL/storage/v1/object/$bucket/$(encode_path "$full")" -o "$dest" 2>/dev/null; then
          FILE_COUNT=$((FILE_COUNT+1))
        else
          echo "    ! fichier ignoré: $bucket/$full" >&2
        fi
      fi
    done
    [[ "$n" -lt 1000 ]] && break
    offset=$((offset+1000))
  done
}

echo "  • fichiers Storage…"
for bucket in "${BUCKETS[@]}"; do
  before=$FILE_COUNT
  if walk_prefix "$bucket" ""; then
    echo "    ✓ $bucket : $((FILE_COUNT-before)) fichier(s)"
  else
    echo "    ! $bucket : introuvable ou vide" >&2
  fi
done

# ── 3) Manifest ──────────────────────────────────────────────────────────────
{
  echo "Tabibo backup"
  echo "date        : $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "database    : $( [[ -f "$DEST/db.sql.gz" ]] && echo "db.sql.gz ($(du -h "$DEST/db.sql.gz" | cut -f1))" || echo "ÉCHEC" )"
  echo "storage     : $FILE_COUNT fichier(s) sur ${#BUCKETS[@]} bucket(s) [${BUCKETS[*]}]"
  echo "total size  : $(du -sh "$DEST" | cut -f1)"
} > "$DEST/MANIFEST.txt"
cat "$DEST/MANIFEST.txt"

# ── 4) Rotation — keep the newest $RETENTION, delete the rest ────────────────
mapfile -t OLD < <(ls -1dt "$BACKUP_DIR"/tabibo-* 2>/dev/null | tail -n +$((RETENTION+1)))
if ((${#OLD[@]})); then
  echo "  • rotation : suppression de ${#OLD[@]} ancienne(s) sauvegarde(s) (garde $RETENTION)"
  for d in "${OLD[@]}"; do rm -rf "$d"; done
fi

echo "✓ Terminé → $DEST"
