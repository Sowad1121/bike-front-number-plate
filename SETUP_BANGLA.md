# Bike Front Number Plate — Firebase + Netlify Setup (PC)

## Important
This is a starter application. It does not automatically verify bKash transactions. Customer orders are pending until you check your own bKash records. Before accepting real customer data, test the entire workflow, apply abuse protection, set privacy/retention policies and enable MFA for administrators where supported. Do not claim BRTA endorsement.

## Business settings
- Website: Bike Front Number Plate
- Plate price: ৳550
- Advance: 30% = ৳165
- Due on delivery: ৳385
- bKash Personal Send Money: 01753303971 (check bKash terms for business use)
- Delivery estimate: **4–7 working days after payment confirmation**, not guaranteed

## 1. Firebase project
1. Go to https://console.firebase.google.com/ and Create project `bike-front-number-plate`.
2. Add a **Web app** in Project settings > Your apps. Copy the public Firebase config values into `firebase-config.js` (apiKey, authDomain, projectId, appId).
3. Build > Authentication > Sign-in method: enable **Email/Password**. In Authentication > Users, add **your admin user**. Confirm/verify its email. Copy its UID for `ADMIN_UID`.
4. Build > Firestore Database > Create database. Choose production mode and region. In Firestore > Rules, paste contents of `firestore.rules`, then **Publish**. These rules deny all browser reads/writes; only server Admin SDK accesses orders.
5. Project settings > Service accounts > Generate new private key (JSON). **Never put this JSON in your project, GitHub or chat.** Convert it to a single-line base64 string on your own PC (PowerShell command below), store ONLY in Netlify environment variable `FIREBASE_SERVICE_ACCOUNT_BASE64`, then remove the local JSON securely.
   PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\service-account.json'))`
   Note: service account creation / some features may depend on your Firebase/Google Cloud project permissions and billing configuration.

## 2. Cloudflare Turnstile
1. Create a Turnstile widget at https://dash.cloudflare.com/ for your final `your-site.netlify.app` hostname (also include localhost if testing locally).
2. In `index.html`, replace `REPLACE_WITH_TURNSTILE_SITE_KEY` with the public site key.
3. Save the secret key for Netlify `TURNSTILE_SECRET_KEY`. Never put it in HTML.

## 3. GitHub
1. Create a private repository at https://github.com/new.
2. Upload the **contents** of this folder to the repository root. Do NOT upload the Firebase service account JSON, base64 credential, passwords, or `.env`.
3. Check `index.html`, `admin.html`, `firebase-config.js`, `netlify.toml`, `package.json`, `firestore.rules`, and `netlify/functions/` are all at the correct paths.

## 4. Netlify
1. https://app.netlify.com/ > Add new project > Import from GitHub > select repository.
2. Base directory: root. Build command: `npm install`. Publish directory: `.`. Functions directory: `netlify/functions` (also set in netlify.toml).
3. Before live use, add Site configuration > Environment variables (available to Functions):
   - `FIREBASE_SERVICE_ACCOUNT_BASE64` = base64 service account JSON (SECRET)
   - `ADMIN_UID` = Firebase Authentication admin user UID
   - `TURNSTILE_SECRET_KEY` = Turnstile secret (SECRET)
   - `RATE_LIMIT_SALT` = long random private string (SECRET)
4. Deploy/redeploy site. Copy its actual URL and add its hostname to the Cloudflare Turnstile widget.
5. Open the homepage. Admin URL is `https://YOUR-SITE.netlify.app/admin.html`.

## 5. Verify end to end
- Order form displays delivery 4–7 working days, price 550, advance 165, balance 385.
- Turnstile loads and validates.
- Submit test order. Firestore > Data > `orders` contains order with `payment_status: pending`.
- Admin login with your email/password. You should see the order and can change statuses.
- A different Firebase user must NOT be able to list or update orders. Firestore browser client access is denied.
- Manually confirm ৳165 is actually in your bKash account, sender/transaction match, then mark `verified`. A claimed Transaction ID alone is NOT proof.
- Check your Netlify Functions logs for errors. Do not log sensitive customer data.

## Security and operations notes
- Admin endpoint requires a valid Firebase ID token, verified email, and exact `ADMIN_UID` match.
- Public Firestore access is denied. All writes happen server-side.
- Order endpoint requires Turnstile, validates fields, and rate-limits by hashed IP (one request/minute). This is baseline abuse protection, not comprehensive anti-fraud.
- A customer can still submit a false bKash transaction ID; do not ship before verifying.
- Limit who can access Firebase/Netlify/GitHub. Enable MFA on provider accounts.
- Establish a privacy notice, data deletion schedule, backups, and customer support contact before launch.
- Firebase / Netlify free tier quotas and billing rules can change. Check before launching.
- Business use of a bKash Personal account may be restricted: confirm applicable bKash rules.
- For more robust production use, add monitoring, more effective rate limiting, pagination, and security testing.
