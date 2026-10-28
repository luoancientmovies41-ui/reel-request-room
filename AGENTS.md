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

- Data access goes through the browser client with RLS; download links live in a separate `movie_links` table readable only by admins or users with an approved request — keeps links hidden until approval.
- Site access is controlled by the `allowed_emails` table via `is_allowed()`; admin role is in `user_roles` (the owner email set in the signup trigger becomes admin).
- Liquid milky-glass styles are defined as utilities (`glass`, `glass-strong`, `bg-gradient-primary`) in src/styles.css; reuse them instead of ad hoc styles.
