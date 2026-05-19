# ARTicles

A modern publishing platform built with **Next.js 14** and **Firebase**.
Write articles, curate links that open *inside* the app, like, comment,
and manage everything from a full admin dashboard.

---

## Features

**For everyone**
- Email/password **authentication** (sign up, log in, log out)
- **Overview** dashboard with live stats
- **Publish** original articles (Markdown supported) **or** share links
- Curated links open **inside ARTicles** in an embedded viewer
- **Browse** with search, tag filters and sorting
- **Top Liked** leaderboard
- **Like / unlike** any article
- **Comment** on every article (delete your own comments)
- **Settings** to edit your profile and notification preference
- Optional **email notification** whenever a new article is published

**For admins**
- Dedicated **Admin Dashboard** with platform stats
- Manage **all articles** (view, delete)
- Manage **users** (change roles, remove records)
- Manage **all comments** (view, delete)

**Theme:** black, crimson red and antique gold — editorial / luxury style.

---

## Tech stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| Framework        | Next.js 14 (App Router)             |
| UI               | React 18 + plain CSS                |
| Database / Auth  | Firebase (Firestore + Authentication) |
| Email (optional) | Resend + Firebase Admin SDK         |
| Hosting          | Vercel                              |

---

## Before you start

You need free accounts for:
1. **Firebase** — https://console.firebase.google.com
2. **GitHub** — https://github.com
3. **Vercel** — https://vercel.com
4. *(Optional, only for emails)* **Resend** — https://resend.com

You also need **Node.js 18.17 or newer** installed: https://nodejs.org

---

## Step 1 — Create the Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com) and click **Add project**.
2. Name it (e.g. `articles`), finish the wizard.
3. In the left menu open **Build > Authentication > Get started**.
   - Open the **Sign-in method** tab.
   - Enable **Email/Password** and **Save**.
4. In the left menu open **Build > Firestore Database > Create database**.
   - Choose **Start in production mode** and pick a location.
5. Register a **Web app**:
   - Click the gear icon > **Project settings**.
   - Scroll to **Your apps**, click the **`</>`** (Web) icon.
   - Give it a nickname and **Register app**.
   - Firebase shows a `firebaseConfig` object — **keep this open**, you need it in Step 3.

---

## Step 2 — Add the Firestore security rules

In the Firebase Console open **Firestore Database > Rules**, replace everything
with the rules below, then click **Publish**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    function isAdmin() {
      return isSignedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{userId} {
      allow read:   if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }

    match /articles/{articleId} {
      allow read:   if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.authorId == request.auth.uid;
      allow update: if isSignedIn() && (
                       resource.data.authorId == request.auth.uid
                       || isAdmin()
                       || request.resource.data.diff(resource.data)
                            .affectedKeys().hasOnly(['likes', 'likeCount'])
                     );
      allow delete: if isSignedIn() && (resource.data.authorId == request.auth.uid || isAdmin());
    }

    match /comments/{commentId} {
      allow read:   if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.authorId == request.auth.uid;
      allow update: if false;
      allow delete: if isSignedIn() && (resource.data.authorId == request.auth.uid || isAdmin());
    }
  }
}
```

These rules let any signed-in user read articles and like them, while only
authors and admins can edit or delete content.

---

## Step 3 — Configure environment variables

1. In the project folder, copy the example file:

   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and fill in the values from your Firebase
   `firebaseConfig` (Step 1):

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

3. Set the admin email — **whoever signs up with this exact email
   automatically becomes an admin**:

   ```
   NEXT_PUBLIC_ADMIN_EMAIL=youremail@example.com
   ```

The email keys (`RESEND_API_KEY`, etc.) can stay blank for now — the app
works fully without them.

---

## Step 4 — Run it locally

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

Create an account using your admin email — when you log in you will see the
**Admin Dashboard** link in the sidebar. Create any other account to test the
normal user experience.

---

## Step 5 — Push to GitHub

1. Create a **new empty repository** on GitHub (no README, no .gitignore).
2. In the project folder run:

   ```bash
   git init
   git add .
   git commit -m "Initial commit - ARTicles"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```

   Replace `YOUR-USERNAME/YOUR-REPO` with your actual repo path.

> `.env.local` is listed in `.gitignore`, so your secret keys are **not**
> pushed to GitHub. That is intentional and correct.

---

## Step 6 — Deploy to Vercel

1. Go to https://vercel.com and **Add New > Project**.
2. **Import** the GitHub repository you just pushed.
3. Vercel auto-detects Next.js — leave the build settings as default.
4. Expand **Environment Variables** and add **every** key from your
   `.env.local` file (same names, same values):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_ADMIN_EMAIL`
   - `NEXT_PUBLIC_APP_URL` — set this to your Vercel URL once known
     (e.g. `https://your-app.vercel.app`)
5. Click **Deploy**.
6. After the first deploy, go to **Firebase Console > Authentication >
   Settings > Authorized domains** and add your Vercel domain
   (e.g. `your-app.vercel.app`) so login works in production.

That is it — your app is live.

---

## Optional — Enable email notifications

The app works perfectly without this. Set it up only if you want a real
email sent to subscribers when a new article is published.

**A. Get a Resend API key**
1. Sign up at https://resend.com.
2. Create an **API key** and copy it.
3. Add to your env (`.env.local` and Vercel):
   ```
   RESEND_API_KEY=re_xxxxxxxx
   NOTIFY_FROM_EMAIL=ARTicles <onboarding@resend.dev>
   ```
   `onboarding@resend.dev` works for testing. To send from your own domain,
   verify it in Resend first.

**B. Add a Firebase service account (lets the server read the subscriber list)**
1. Firebase Console > **Project settings > Service accounts**.
2. Click **Generate new private key** — a JSON file downloads.
3. Convert that JSON file to a single base64 string:
   - macOS / Linux: `base64 -i serviceAccount.json`
   - Windows PowerShell:
     `[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccount.json"))`
4. Add the result to your env (`.env.local` and Vercel):
   ```
   FIREBASE_SERVICE_ACCOUNT_B64=eyJ0eXBlIjoic2Vydm...
   ```

Redeploy. New articles will now email everyone who has email notifications
enabled in their Settings.

---

## How roles work

- Anyone who signs up with the email set in `NEXT_PUBLIC_ADMIN_EMAIL` becomes
  an **admin** automatically.
- Admins can promote or demote other users from the **Admin Dashboard > Users**
  tab.

---

## Project structure

```
articles/
├── app/
│   ├── layout.js              Root layout + fonts
│   ├── page.js                Landing page
│   ├── login/                 Log in
│   ├── signup/                Sign up
│   ├── api/notify/            Email notification endpoint
│   └── dashboard/
│       ├── layout.js          Auth guard + sidebar shell
│       ├── page.js            Overview
│       ├── publish/           Write article / share link
│       ├── browse/            Browse + search + filter
│       ├── top-liked/         Leaderboard
│       ├── article/[id]/      Article view, likes, comments
│       ├── admin/             Admin dashboard
│       └── settings/          Profile settings
├── components/                Reusable UI (Sidebar, ArticleCard, ...)
├── lib/                       Firebase init + helpers
└── .env.local.example         Environment variable template
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Firebase not configured" message | Fill in `.env.local` and restart `npm run dev`. |
| Login fails on Vercel | Add your Vercel domain to Firebase **Authorized domains**. |
| "Missing or insufficient permissions" | Re-check the Firestore rules from Step 2 were published. |
| Admin link not showing | Make sure you signed up with the `NEXT_PUBLIC_ADMIN_EMAIL` address. |
| A shared link shows a blank box | That website blocks embedding — use the "Open original" button. This is a browser security restriction, not a bug. |
| Emails not sending | Email is optional; check `RESEND_API_KEY` and `FIREBASE_SERVICE_ACCOUNT_B64`. |

---

## A note on embedded links

When you share a **link**, ARTicles opens it inside an embedded viewer so
readers stay in the app. Some websites (e.g. large platforms) send a security
header that forbids being embedded — for those, the viewer area may appear
blank and readers can use the always-available **"Open original"** button.
This is a limitation of the web itself, not of ARTicles.

---

Built with Next.js & Firebase. Enjoy ARTicles.
