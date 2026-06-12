export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Avoid multiple registrations during HMR in development or when cluster mode runs
    const globalSync = global as any;
    if (!globalSync.schedulerStarted) {
      globalSync.schedulerStarted = true;
      
      console.log('===================================================');
      console.log('Initializing Background Scraper Scheduler...');
      console.log('===================================================');
      
      // Dynamically import runSync to avoid circular imports during startup
      const { runSync } = await import('@/lib/sync');

      // Default interval: 1 hour (3600000ms)
      const intervalMs = process.env.AUTO_SYNC_INTERVAL
        ? parseInt(process.env.AUTO_SYNC_INTERVAL, 10)
        : 60 * 60 * 1000;

      console.log(`Scheduler started. Auto-sync interval: ${intervalMs / 1000 / 60} minutes.`);

      // Execute initial startup sync after 5 seconds to catch up
      setTimeout(async () => {
        try {
          console.log('Running startup auto-sync...');
          await runSync(undefined, 'cron');
        } catch (error) {
          console.error('Error during startup auto-sync:', error);
        }
      }, 5000);

      // Setup recurring sync
      setInterval(async () => {
        try {
          console.log('Running scheduled auto-sync...');
          await runSync(undefined, 'cron');
        } catch (error) {
          console.error('Error during scheduled auto-sync:', error);
        }
      }, intervalMs);
    }
  }
}
