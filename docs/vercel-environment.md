# Production environment setup

The private root `.env.vercel` file contains the locally verified Atlas URI and the exact production origin. It is ignored by Git and Vercel upload filtering. Keep credentials in Vercel's environment settings; committing this file is unnecessary.

In your Vercel project, open Settings → Environment Variables and set these keys for **Production**:

| Key | Value |
| --- | --- |
| `MONGODB_URI` | Copy the private Atlas value from `.env.vercel`. |
| `APP_ORIGIN` | `https://fingertipfrenzyieeeaarohan2026-fbq3.vercel.app` |
| `NODE_ENV` | `production` |

When entering values individually, copy only the value without the surrounding .env quotes. Replace existing values for these keys rather than leaving an older value active. No `VITE_MONGODB_URI` is needed; database credentials belong only in the backend runtime environment. No frontend API base URL is needed because browser requests use the same-origin `/api` path.

Save the changes, then create a new **Production** deployment of the latest commit. Existing deployments retain their previous environment snapshot. Use the stable production domain above for registration/login, rather than a preview domain whose origin does not match APP_ORIGIN. Preview environments need their own origin and database configuration.

The local production file can be checked with Node 24:

```powershell
node --env-file=.env.vercel scripts/check-database.mjs
```

The check is read-only and prints only connection and topology status. It does not verify connectivity from Vercel's outbound IP addresses. Atlas Network Access must permit those connections; allowing only your computer's IP is insufficient.

After deployment, `/api/health/ready` should return HTTP 200 with `database: connected`. If it still returns 503, inspect its safe diagnostic code in conjunction with Atlas Network Access and cluster status. The local Atlas URI was verified successfully, but the Vercel settings and live connection must be checked after deployment.

## Login returns 403

The application's login route rejects a browser Origin that differs from APP_ORIGIN with `ORIGIN_NOT_PERMITTED`. Set the Production APP_ORIGIN to the stable HTTPS domain in the table above, save it, and create a new deployment. Open the login page on that same stable domain. A preview URL is a different origin and needs separate Preview configuration.

The origin check now accepts harmless surrounding whitespace/quotes and a trailing slash in the configured value, while rejecting URLs with credentials, paths, query strings or fragments. Different sites still cannot submit state-changing requests. Forwarded Host headers do not extend the allowed origins. Regression checks verify accepted formatting and rejected foreign origins.

References: [Vercel environment variables](https://vercel.com/docs/environment-variables) and [Atlas connection troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).
