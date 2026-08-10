import { AppDataSource } from './data-source';
import { syncVerifiedPapers } from './sync-verified-papers';

async function run() {
  await AppDataSource.initialize();
  const synced = await syncVerifiedPapers(AppDataSource);
  await AppDataSource.destroy();
  console.log(`Verified paper sync completed: ${synced.map((item) => `${item.year} ${item.subject} (${item.questions} questions)`).join(', ')}`);
}

run().catch(async (error: unknown) => {
  console.error(error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
