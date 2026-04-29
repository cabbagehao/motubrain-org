import { applyPagePack } from '@/core/page-pack/apply';

async function main() {
  const packName = process.argv[2];

  if (!packName) {
    throw new Error('Usage: pnpm pack:apply <pack-name>');
  }

  const definition = await applyPagePack({
    repoRoot: process.cwd(),
    packName,
  });

  console.log(
    `Applied page pack "${definition.manifest.name}" with ${definition.manifest.managedPaths.length} managed paths.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
