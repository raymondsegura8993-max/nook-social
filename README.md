# Nook

**Your corner of the internet.**

Nook is a social platform for sharing ideas, photos, videos, and live moments, discovering creators, and building community.

**Live site:** https://raymondsegura8993-max.github.io/nook-social/

## Product experience

- Home feed with For You, Following, Latest, Hashtags, and Trending views
- Profiles, follows, stories, posts, comments, reactions, and sharing
- Photo and video publishing, in-app recording, and a browser-based video editor
- Explore, creator leaderboards, and communities
- Live streaming, co-host requests, battles, gifts, and raids
- Direct messages, notifications, and creator tools
- Profile themes, verification requests, and moderation tools

Some features depend on Supabase configuration, browser permissions, and supported media formats. Camera, microphone, and livestream features require HTTPS and user permission.

## Technology

- Static frontend hosted with GitHub Pages
- Supabase for authentication, database, storage, and realtime features
- LiveKit for live audio/video rooms

## Deployment

The site is served from the repository's GitHub Pages deployment. Changes pushed to the configured Pages branch are published by GitHub Pages after its build/deployment finishes.

## Configuration and safety

- Keep service-role keys and other privileged secrets out of browser code.
- The browser may use only the project's intended public client key with appropriate Row Level Security policies.
- Review Supabase RLS policies, Storage policies, Edge Functions, and realtime publication settings before production launch.
- Test sign-up, sign-in, posting, media upload, messaging, moderation, and live features with separate test accounts.
- Camera and microphone access must be requested by the browser; users should only grant access when they intend to record or join a live session.

## Project structure

- `index.html` — main Nook application and styles
- `live-battles.js` — live battle interface and related client behavior
- `favicon.svg` — Nook browser icon

---

Nook is an evolving project. Feature availability may vary while the platform is being tested and improved.
