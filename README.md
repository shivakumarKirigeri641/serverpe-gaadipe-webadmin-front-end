# GaadiPe Web Admin

The website admin for gaadipe.in and its chat, kept apart from the main admin
panel. It is read-only and has five screens:

- **Overview**: visitors, sign-ins, paid reports and revenue from the website,
  the visit-to-payment funnel, an hourly or daily chart, and top sources.
- **Ads & sources**: Google Ads and Meta ads side by side, then every source,
  showing visitors, sign-ins, paid reports, revenue and visit-to-paid rate.
- **Visitors**: every browser that opened the site, with its source, place,
  device and linked customer. Tap one to see its trail.
- **Customers**: customers who signed in on the website, with their checks,
  payments and notification status.
- **Free checks**: the chat's checks done without signing in, and how many of
  those people then signed in.

All screens can show today, the last 7 days or the last 30 days (Indian time),
and refresh every minute.

## How it connects

The app uses the same gateway (`/admin/api`), the same admin passcode, and the
same encrypted tunnel (`src/lib/secure.js`) as `serverpe-gaadipe-admin-front-end`.

On the gateway, the screens read from `src/admin/web.js` through `/admin/api/web/*`
(in `src/routes/adminApi.js`). Mobile numbers are masked for admin roles
without the `pii` permission, the same as everywhere else in the admin.

## Develop

```bash
npm install
npm run dev        # http://localhost:5175, with /admin/api proxied to the local gateway on :5007
```

## Deploy

1. `npm run build` (needs `.env.production`; copy `.env.example`).
2. Upload `dist/` to the web admin's host, for example `webadmin.gaadipe.in`.
3. On the server, add that address to `ADMIN_ORIGINS` in the gateway's `.env`
   (comma-separated), then `pm2 restart serverpe-gaadipe --update-env`.
