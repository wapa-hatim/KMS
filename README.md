# Northstar KMS

A React knowledge-management workspace for creating, organizing, and finding internal documentation. The interface works in demo mode out of the box and can connect to Supabase for authenticated storage.

## Run locally

```sh
npm install
npm run dev
```

## Supabase setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql), followed by [`supabase/migrations/202611020001_workspace_admin.sql`](supabase/migrations/202611020001_workspace_admin.sql), [`supabase/migrations/202611020002_content_workflows.sql`](supabase/migrations/202611020002_content_workflows.sql), and [`supabase/migrations/202611020003_reports_access.sql`](supabase/migrations/202611020003_reports_access.sql), in that order, in its SQL editor.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Add your local and deployed app origins to Supabase Auth's allowed redirect URLs. Invitation links return to `/?invite=...` on that origin.
4. Start the app and create an account with your work email. Confirm your email, then create a space and owner membership for the authenticated user's UUID in the SQL editor before accessing documents:

```sql
insert into public.spaces (name, created_by)
values ('Northstar', 'AUTH_USER_UUID')
returning id;

insert into public.space_members (space_id, user_id, role)
values ('SPACE_UUID', 'AUTH_USER_UUID', 'owner');
```

Replace the UUID placeholders with the user's ID from Supabase Auth and the ID returned by the first statement.

Without Supabase credentials the app uses local demo content. Use the role selector in the top bar to preview the owner, editor, and reader dashboards. Demo edits are held in browser memory and are not persisted.

Authentication, session management, role dashboards, and Supabase client setup are separated under `src/auth`, `src/components`, and `src/lib`.

The owner, editor, and reader dashboards use the signed-in user's `space_members.role`. Readers can only query published documents. Editors can create and edit documents; owners can also manage workspace membership. The schema enforces these rules with row-level security.

Owners can invite readers and editors from **People & access**. Supabase sends a one-time email sign-in link; the migration stores only a hash of the seven-day invitation token and checks the signed-in email before granting membership. Owners can also change roles, remove members, and update the workspace name and review interval. **Reports & analytics** summarizes the loaded workspace documents and recorded document changes, with CSV export.

Documents support Markdown/GFM authoring, live preview, SOP/post-mortem/design/FAQ templates, tags, collection selection, owner assignment, and up to 50 MB per attachment. Attachments use the private `kms-documents` bucket with signed downloads. Document readers can review diffs and restore earlier snapshots. Editors create drafts and submit them for review; owners publish/archive. Collections support nesting, rename, and archive.

Reports are available only to owners and editors; the final migration applies the same restriction to audit-event reads through row-level security. The current search UI still filters loaded documents locally; the database full-text RPC is available for the next search-pagination integration. OCR/attachment text extraction, inline real-time co-editing/comments/mentions, SSO provider setup, RAG, and usage/search analytics require additional services or follow-up work. Supabase migrations need to be applied and tested against the target project before production deployment.

## Stack

React + Vite, Supabase Auth/Postgres, CoreUI, Bootstrap, Radix UI primitives, and Lucide icons.
