# Sellora

Sellora is a storefront web application where customers can browse products, search by category, manage a local cart, and sign in or create an account.

## Highlights

- Product catalogue with search and category filters
- Local cart persisted in the browser
- Email/password authentication
- Google authentication
- Firestore user-profile storage
- Responsive login and registration pages

## Built with

- Next.js 16
- React 19 and TypeScript
- Firebase Authentication
- Cloud Firestore and Firebase Admin SDK
- CSS Modules

## Getting started

### Prerequisites

- Node.js 20.9 or later
- npm
- A Firebase project with Authentication and Cloud Firestore enabled

### Installation

```bash
git clone <repository-url>
cd sellora
npm install
```

### Firebase configuration

Enable the following sign-in methods in Firebase Authentication:

- Email/Password
- Google

Create a Firestore database, then add a `.env.local` file at the project root with your Firebase Admin service-account credentials:

```dotenv
PROJECT_ID=your-firebase-project-id
CLIENT_EMAIL=your-service-account-email
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
```

`PRIVATE_KEY` must retain the literal `\\n` line-break markers. The server converts them when initializing Firebase Admin.

The Firebase client configuration is located in `lib/firebase.ts`. Update it if you are connecting Sellora to a different Firebase project.

### Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Start the production server. |
| `npm run lint` | Run ESLint. |

## Project structure

```text
app/                 Pages, styles, and API routes
context/             Authentication provider and hooks
functions/           Client-side authentication helpers
lib/                 Firebase client and Admin setup
public/              Logos and other static assets
```

## Authentication flow

Firebase Authentication handles sign-up and sign-in in the browser. The client then sends the authenticated user's Firebase ID token to the Next.js API routes. On the server, Firebase Admin verifies that token before creating, updating, or retrieving the corresponding profile from the Firestore `users` collection.

Cart data is stored locally in the browser under the `sellora_cart` key and is not currently associated with a user account.

## Deployment

Run `npm run build` before deploying to a Next.js-compatible hosting platform. Configure `PROJECT_ID`, `CLIENT_EMAIL`, and `PRIVATE_KEY` as production environment variables; do not commit `.env.local` or a Firebase service-account key.
