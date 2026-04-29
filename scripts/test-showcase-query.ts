import { getLatestShowcases } from '@/shared/models/showcase';

async function testQuery() {
  console.log('\n=== Testing Showcase Queries ===\n');

  // Test 1: Get all hairstyles
  console.log('1. All hairstyles (tags="hairstyles"):');
  const allHairstyles = await getLatestShowcases({
    tags: 'hairstyles',
    limit: 20,
  });
  console.log(`Found ${allHairstyles.length} items`);
  allHairstyles.forEach((item) => {
    console.log(`  - ${item.title} | Tags: ${item.tags} | Prompt: ${item.prompt}`);
  });

  // Test 2: Women hairstyles with searchTerm
  console.log('\n2. Women hairstyles (tags="hairstyles", searchTerm="women"):');
  const womenHairstyles = await getLatestShowcases({
    tags: 'hairstyles',
    searchTerm: 'women',
    limit: 20,
  });
  console.log(`Found ${womenHairstyles.length} items`);
  womenHairstyles.forEach((item) => {
    console.log(`  - ${item.title} | Tags: ${item.tags} | Prompt: ${item.prompt}`);
  });

  // Test 3: Just searchTerm without tags filter
  console.log('\n3. Search "women" without tags filter:');
  const searchWomen = await getLatestShowcases({
    searchTerm: 'women',
    limit: 20,
  });
  console.log(`Found ${searchWomen.length} items`);
  searchWomen.forEach((item) => {
    console.log(`  - ${item.title} | Tags: ${item.tags} | Prompt: ${item.prompt}`);
  });

  // Test 4: All showcases
  console.log('\n4. All showcases (no filters):');
  const allShowcases = await getLatestShowcases({
    limit: 20,
  });
  console.log(`Found ${allShowcases.length} items`);
  allShowcases.forEach((item) => {
    console.log(`  - ${item.title} | Tags: ${item.tags} | Prompt: ${item.prompt}`);
  });
}

testQuery()
  .then(() => {
    console.log('\n=== Test Complete ===\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
