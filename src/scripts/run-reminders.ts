import { runReminderJob } from "../lib/reminders";

async function main() {
  const sent = await runReminderJob();
  console.log(JSON.stringify({ sent }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
