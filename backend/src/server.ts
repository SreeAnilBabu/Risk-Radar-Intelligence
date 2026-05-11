import "dotenv/config";
import { createApp } from "./app";
import { ping } from "./data/passportDb";

const app = createApp();
const port = Number(process.env.PORT ?? 3010);
const passportEnabled = (process.env.RISKRADAR_DATA_SOURCE ?? "").toLowerCase() === "passport";

app.listen(port, async () => {
  process.stdout.write(`RiskRadar backend listening on http://localhost:${port}\n`);
  if (!passportEnabled) {
    process.stdout.write("[data] using local JSON seed data (set RISKRADAR_DATA_SOURCE=passport to enable DB)\n");
    return;
  }
  process.stdout.write(
    `[data] passport mode \u2014 connecting to ${process.env.PASSPORT_DB_HOST}:${process.env.PASSPORT_DB_PORT ?? 1433}/${process.env.PASSPORT_DB_NAME}\n`
  );
  const ok = await ping();
  if (ok) {
    process.stdout.write("[data] \u2713 Passport DB reachable \u2014 live queries enabled\n");
  } else {
    process.stdout.write("[data] \u2717 Passport DB unreachable \u2014 every loader will fall back to JSON\n");
  }
});
