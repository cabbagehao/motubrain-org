import { grantCreditsForUser } from '@/shared/models/credit';
import { getUsers, getUserCredits } from '@/shared/models/user';

function parseArgs() {
  const args = process.argv.slice(2);
  const email = args[0];
  const credits = Number(args[1]);
  const description = args[2] || `manual grant for ${email}`;

  if (!email) {
    throw new Error('Usage: tsx scripts/grant-credits.ts <email> <credits> [description]');
  }

  if (!Number.isFinite(credits) || credits <= 0) {
    throw new Error('credits must be a positive number');
  }

  return { email, credits, description };
}

async function main() {
  const { email, credits, description } = parseArgs();

  const users = await getUsers({ email, limit: 1 });
  const user = users[0];

  if (!user) {
    throw new Error(`user not found: ${email}`);
  }

  const before = await getUserCredits(user.id);
  const granted = await grantCreditsForUser({
    user,
    credits,
    description,
  });
  const after = await getUserCredits(user.id);

  console.log(
    JSON.stringify(
      {
        userId: user.id,
        email: user.email,
        before,
        granted,
        after,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
