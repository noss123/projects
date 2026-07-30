# Admin Setup (TAs / Course Staff)

This template includes workflows that create weekly snapshot tags/releases and detect tampering.
To make this *enforceable* when teams have full write access, you must configure GitHub repository settings.

## 1) Protect the weekly snapshot tags (required)

In GitHub:

1. Go to **Settings → Tags** (or **Rules → Tag protection rules** depending on UI).
2. Add a rule for the pattern:

   - `submission-week-*`

3. Ensure that students cannot delete or force-update these tags.

Why: the weekly submission is anchored on an annotated git tag. If the tag can be moved, the snapshot can be rewritten.

## 2) Restrict release editing (recommended)

The workflows create releases. Students *should not* be able to edit them.
If possible, restrict release editing to maintainers/TAs.

Note: even if a release body is edited, `snapshot-integrity.yml` will detect it because the release body must equal the annotated tag message.

## 3) Optional: protect the default branch

If you can, enable branch protection on `main`:

- Require pull requests
- Require status checks to pass

This further discourages last-minute “history rewriting”.

## 4) Required files list

Weekly submission enforces commits touching:

- `docs/StatusTracker.xls`
- `docs/ProjectPlan.md`

To change the list, edit `REQUIRED_WEEKLY_FILES` in `.github/workflows/weekly-snapshot.yml`.
