# Database Indexes Guide

The database migrations include indexes for the main user-facing flows:

- question and task listing by `category_id`, `difficulty`, and `created_at`
- user-owned answer/submission lookups used by RLS
- mock interview discovery by published status, rating, and date
- trigram search on question/task `title` and `description`

## Migrations

- `20260417080000_initial_schema.sql` creates the schema, base indexes, and RLS policies.
- `20260418000000_performance_indexes.sql` adds composite indexes and the `increment_user_progress` helper.
- `20260418000000_add_performance_indexes.sql` keeps additional indexes aligned with the current schema.
- `20260516000000_search_and_rls_performance.sql` adds trigram search indexes and optimizes RLS policies by wrapping `auth.uid()` in `select`.

## Query Patterns Covered

Questions:

```sql
select *
from public.questions
where category_id = $1
  and difficulty = $2
order by created_at desc;
```

Tasks:

```sql
select *
from public.tasks
where category_id = $1
  and difficulty = any($2)
order by created_at desc;
```

Search:

```sql
select *
from public.questions
where title ilike '%goroutine%'
   or description ilike '%goroutine%';
```

User progress and history:

```sql
select *
from public.question_answers
where user_id = (select auth.uid())
order by created_at desc;
```

## Notes

Trigram indexes require `pg_trgm`, enabled in `20260516000000_search_and_rls_performance.sql`.

For large datasets, prefer server-side filtering, pagination with `.range()`, and indexed search over loading all rows and filtering in the browser.
