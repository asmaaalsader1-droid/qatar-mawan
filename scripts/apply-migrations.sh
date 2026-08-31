#!/usr/bin/env bash
# ينشئ كل الجداول والسياسات والبيانات الأولية على Supabase.
# الاستخدام:  DB_PASSWORD="كلمة-الممر" ./scripts/apply-migrations.sh
set -euo pipefail

: "${DB_PASSWORD:?DB_PASSWORD مطلوبة — احصل عليها من Supabase Dashboard → Settings → Database}"
REF="wxknpssoebirzguwcivf"
DB_URL="postgresql://postgres.${REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

if ! command -v psql >/dev/null 2>&1; then
  echo "تثبيت عميل psql..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq postgresql-client >/dev/null
  else
    echo "ثبّت postgresql-client يدوياً" >&2; exit 1
  fi
fi

echo "==> 1/4 إنشاء المخطط (الجداول + enums + indexes)..."
PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/migrations/0001_schema.sql

echo "==> 2/4 تفعيل سياسات الأمان (RLS)..."
PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/migrations/0002_rls.sql

echo "==> 3/4 إدراج البيانات الأولية (30 عاملة + 20 مقالاً + الإعدادات)..."
PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql

echo "==> 4/4 إصلاح إعدادات Realtime للحذف..."
PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/migrations/0005_daily_visitors_replica_identity.sql

echo "✓ تم. الجداول والبيانات وإعدادات الحذف جاهزة."
