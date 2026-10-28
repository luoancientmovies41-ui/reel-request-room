<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Auth and data use the user's Firebase project (src/lib/firebase.ts: Firebase Auth + Firestore collections movies, movie_links, download_requests, allowed_emails) — user chose Firebase over the built-in backend.
- Admin is the single email constant ADMIN_EMAIL; site access = admin or a doc id in allowed_emails.
- Drive sharing on approval runs in a server function that verifies the caller's Firebase ID token is the admin before using the Google Drive connector.
- Liquid milky-glass styles are defined as utilities (`glass`, `glass-strong`, `bg-gradient-primary`) in src/styles.css; reuse them instead of ad hoc styles.
