export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startRecorderScheduler } = await import("./lib/recorder-scheduler");
    startRecorderScheduler();
  }
}
