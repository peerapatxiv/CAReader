# Service Explorer

Browse a Layer7 API Gateway service export (`service.rtf` or the raw RESTMAN `.xml`) in the browser.
Everything runs locally in the page: the file is never uploaded.

## Use it

Open `dist/index.html` (double-click works, no server needed), then drop `service.rtf` on the page.

- **Upload file / REST Man API** toggle (Upload file is the default). REST Man API: enter the export URL (GET), username and password and press **Load** (sent as Basic auth; URL and username are remembered, the password never is). Gateways usually block browser calls (CORS), so use it from `npm run dev`, which forwards the call through a local proxy. The proxy calls the gateway like `curl -k` (no certificate check), with `--data '{}'` and the User-Agent `Android/15.1.0;FastEasy/3.99.0/10999`; set `GATEWAY_USER_AGENT=...` to change it or `GATEWAY_STRICT_TLS=1` to check certificates.
- **Overview**: totals (disabled, no scope check, no backend route, test APIs), a *Worth checking* list (likely scope typos, enabled test APIs, enabled APIs without a scope check), and breakdowns of required scopes, backend hosts, methods, shared policies and folders. Click anything to see those APIs.
- **Services**: search name / URL / scope / backend / policy (⌘K, Ctrl K or `/`; matches are highlighted), filter by status, method, **required scope**, backend, shared policy, folder, **test APIs** (show only / hide) and flags; sort any column; ↑/↓ to move, Esc to close, `?` for shortcuts.
- **Detail panel** (opens beside the table): the request route as three steps (gateway path, required scopes, backend), IDs, flags, shared policies used, and the full policy XML (copy or download).
- **Required scopes** come from the `given_scopes` parameter of the Access Token Validator in each policy. Validators switched off in the policy (`Enabled=false`) don't count.
- **Assertion filter**: every assertion used by policies, both encapsulated (e.g. *Access Token Validator*, *OTK …*) and built-in (named as in Policy Manager, e.g. *Route via HTTP(S)*, *Set Context Variable*). Switched-off ones appear as *"<name> (disabled)"*. Assertion names are also searchable, and the detail panel's **Assertions** tab lists a policy's steps in order.
- **Test APIs** are those whose name or URL contains *test* (not inside latest/attest/contest/protest) or the words *poc, mock, demo, dummy, sandbox*.
- **Export CSV** saves the current filtered list (includes a `scopes` column). Filters and the selected API are kept in the URL.
- The last opened file is remembered on this computer (browser storage), so you can **Reopen** it without dropping it again.

## Develop

```bash
npm install
npm run dev     # local dev server
npm test        # unit tests (includes a check against ../service.rtf if present)
npm run build   # writes the single self-contained dist/index.html
```

Code map: `src/core/` (RTF unwrap, parser, query/sort/facets, CSV — pure and tested), `src/worker.ts` (parses off the main thread), `src/ui/` (Preact components).
