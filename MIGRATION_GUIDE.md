# Database Migration Guide - Lookup Tables

This guide provides **three different approaches** to create the lookup tables for the Enfuce CPCP Portal. Choose the approach that works best for your situation.

---

## 🎯 What This Migration Does

Creates 6 lookup tables with reference data:
- **card_schemes**: 6 schemes (Visa, Mastercard, **American Express**, Discover, UnionPay, JCB)
- **program_types**: 8 types (corporate, fleet, meal, travel, gift, transport, healthcare, education)
- **funding_models**: 5 models (prepaid, debit, credit, charge, hybrid)
- **form_factors**: 3 types (physical, virtual, digital_wallet)
- **currencies**: 10 currencies (EUR, USD, GBP, CHF, SEK, NOK, DKK, PLN, CZK, HUF)
- **configuration_statuses**: 5 statuses (draft, submitted, approved, rejected, active)

---

## ⚡ Approach 1: Automated Migration (RECOMMENDED)

**Best for**: Clean deployments or when you're confident the database is in a good state.

### File: `003_reset_and_create_lookup_tables.sql`

### Steps:

1. **Open Supabase SQL Editor**
   - Go to your Supabase project
   - Click "SQL Editor" in the sidebar
   - Click "New Query"

2. **Copy the entire migration file**
   ```bash
   # The file is at:
   supabase/migrations/003_reset_and_create_lookup_tables.sql
   ```

3. **Paste and Run**
   - Paste the entire contents into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Watch for Success Message**
   ```
   ========================================
   ✓ MIGRATION COMPLETED SUCCESSFULLY!
   ========================================

   Reference Data:
     ✓ Card Schemes: 6 (includes American Express!)
     ✓ Program Types: 8
     ✓ Funding Models: 5
     ✓ Form Factors: 3
     ✓ Currencies: 10
     ✓ Configuration Statuses: 5

   Database Objects:
     ✓ Indexes: 12
     ✓ Triggers: 6
     ✓ RLS Policies: 6
   ```

### What It Does:

1. ✅ **Nuclear cleanup** - Drops ALL related objects (views, functions, triggers, indexes, policies, tables)
2. ✅ **Verification** - Confirms cleanup was successful
3. ✅ **Creates fresh tables** - With correct schema including sort_order
4. ✅ **Creates indexes** - For performance
5. ✅ **Inserts data** - All reference data including American Express
6. ✅ **Creates triggers** - For updated_at timestamps
7. ✅ **Enables RLS** - Row-level security with policies
8. ✅ **Final verification** - Confirms everything is correct

### If It Fails:

Move to **Approach 2** (Manual Cleanup) or **Approach 3** (Fresh Database).

---

## 🔧 Approach 2: Manual Step-by-Step (TROUBLESHOOTING)

**Best for**: When the automated migration fails, or you want full control over each step.

### File: `MANUAL_CLEANUP.sql`

### Steps:

1. **Open the file** `supabase/migrations/MANUAL_CLEANUP.sql`

2. **Run SECTION 1 first** - Check current state
   - Copy SECTION 1 only
   - Paste into SQL Editor
   - Run it
   - Review what exists

3. **Run each section in order**
   - Copy one SECTION at a time
   - Paste and run
   - Wait for it to complete
   - Check the results
   - Move to next section

4. **Key sections to watch**:
   - **SECTION 4**: Should return 0 rows (confirms cleanup)
   - **SECTION 6**: Should return 6 rows (confirms sort_order column exists)
   - **SECTION 8**: Should show correct counts
   - **SECTION 9**: Should show American Express

### Benefits:

- ✅ You see exactly what's happening at each step
- ✅ Can diagnose issues as they occur
- ✅ Can skip sections if needed
- ✅ Easier to recover from errors

### If This Fails:

Move to **Approach 3** (Fresh Database).

---

## 🆕 Approach 3: Fresh Database (NUCLEAR OPTION)

**Best for**: When all else fails, or you don't have important data to preserve.

### ⚠️ WARNING: This will delete ALL tables in your database!

### Steps:

1. **Backup your data first** (if you have any important data)
   ```sql
   -- Run these queries to export data you want to keep
   SELECT * FROM configurations;
   -- Save the results
   ```

2. **Drop the entire schema**
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```

3. **Enable UUID extension**
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

4. **Run the automated migration**
   - Use Approach 1 (003_reset_and_create_lookup_tables.sql)
   - Should work cleanly now

5. **Restore your data** (if you backed up any)

---

## ✅ Verification Steps

After running ANY approach, verify success:

### 1. Check Tables Exist
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('card_schemes', 'program_types', 'funding_models',
                  'form_factors', 'currencies', 'configuration_statuses')
ORDER BY tablename;
```
**Expected**: 6 rows

### 2. Check American Express
```sql
SELECT code, display_name, is_active, sort_order
FROM card_schemes
WHERE code = 'American Express';
```
**Expected**: 1 row with American Express

### 3. Check All Data Counts
```sql
SELECT 'card_schemes' as table_name, COUNT(*) as count FROM card_schemes
UNION ALL SELECT 'program_types', COUNT(*) FROM program_types
UNION ALL SELECT 'funding_models', COUNT(*) FROM funding_models
UNION ALL SELECT 'form_factors', COUNT(*) FROM form_factors
UNION ALL SELECT 'currencies', COUNT(*) FROM currencies
UNION ALL SELECT 'configuration_statuses', COUNT(*) FROM configuration_statuses;
```
**Expected**:
- card_schemes: 6
- program_types: 8
- funding_models: 5
- form_factors: 3
- currencies: 10
- configuration_statuses: 5

### 4. Check sort_order Column Exists
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'sort_order'
AND table_name IN ('card_schemes', 'program_types', 'funding_models',
                   'form_factors', 'currencies', 'configuration_statuses');
```
**Expected**: 6 rows (one for each table)

### 5. Test API Endpoint
```bash
curl https://your-app.vercel.app/api/configurations/schema | jq '.schema.card_scheme.options'
```
**Expected**: Array including "American Express"

### 6. Test Wizard
- Open your portal
- Start creating a configuration
- Check that American Express appears in card scheme options

---

## 🐛 Common Issues and Solutions

### Issue 1: "column sort_order does not exist"

**Cause**: Tables exist from previous migration without sort_order column

**Solution**: Use Approach 2 (Manual Cleanup) to drop tables completely, then recreate

### Issue 2: "permission denied"

**Cause**: RLS policies or insufficient permissions

**Solution**:
```sql
-- Disable RLS temporarily
ALTER TABLE card_schemes DISABLE ROW LEVEL SECURITY;
-- Retry operation
-- Then re-enable RLS
ALTER TABLE card_schemes ENABLE ROW LEVEL SECURITY;
```

### Issue 3: "relation does not exist"

**Cause**: Tables were not created successfully

**Solution**: Run verification query to check which tables exist:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Issue 4: Migration runs but no success message

**Cause**: RAISE NOTICE might not show in your SQL Editor

**Solution**: Run verification queries manually (see Verification Steps above)

### Issue 5: "duplicate key value violates unique constraint"

**Cause**: Data already exists in table

**Solution**: Either:
- Drop and recreate tables (Approach 2)
- Or update existing records instead of inserting

---

## 🔄 Rollback Plan

If you need to undo the migration:

```sql
-- Drop all lookup tables
DROP TABLE IF EXISTS card_schemes CASCADE;
DROP TABLE IF EXISTS program_types CASCADE;
DROP TABLE IF EXISTS funding_models CASCADE;
DROP TABLE IF EXISTS form_factors CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;
DROP TABLE IF EXISTS configuration_statuses CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

---

## 📝 Next Steps After Successful Migration

1. ✅ Verify American Express appears in database
2. ✅ Test API endpoint returns American Express
3. ✅ Test wizard shows American Express option
4. ✅ Run EVALS to establish baseline: `npm run evals`
5. ✅ Commit and push changes
6. ✅ Deploy to production
7. ✅ Monitor CI/CD pipeline

---

## 💡 Tips

- **Run migrations during low-traffic periods**
- **Always backup important data first**
- **Test in a development environment first** (if possible)
- **Use Approach 1 for speed, Approach 2 for control**
- **Keep the SQL Editor open** to see all messages
- **Check Supabase logs** if something goes wrong
- **Use the Table Editor** in Supabase to verify data visually

---

## 📞 Getting Help

If you encounter issues not covered here:

1. Check Supabase logs (Dashboard → Logs)
2. Check browser console (F12 → Console)
3. Verify environment variables are set correctly
4. Check that Supabase client is configured properly
5. Review the API endpoint logs in Vercel

---

## 🎉 Success Checklist

After migration is complete, you should have:

- ✅ 6 lookup tables created with sort_order column
- ✅ American Express in card_schemes table
- ✅ All reference data inserted (6+8+5+3+10+5 = 37 records)
- ✅ 12 indexes for performance
- ✅ 6 triggers for updated_at
- ✅ 6 RLS policies for security
- ✅ Schema API endpoint returns dynamic options
- ✅ Wizard displays American Express option
- ✅ EVALS passing with good accuracy
- ✅ CI/CD pipeline running on deployments

**You're ready to go live!** 🚀
