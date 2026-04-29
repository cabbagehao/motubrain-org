import { extractHairstyleTags } from '@/shared/lib/tags';

const testCases = [
  { prompt: 'men hairstyle', title: 'Cool Men Hairstyle', expected: 'hairstyles,men' },
  { prompt: 'women hairstyle', title: 'Beautiful Women Hairstyle', expected: 'hairstyles,women' },
  { prompt: 'woman with long hair', title: 'Woman Hairstyle 1', expected: 'hairstyles,women' },
  { prompt: 'male haircut', title: 'Male Style', expected: 'hairstyles,men' },
  { prompt: 'cat hairstyle', title: 'Animal Hairstyle 1', expected: 'hairstyles,animal' },
  { prompt: 'dog with funny hair', title: 'Pet Hairstyle', expected: 'hairstyles,animal' },
  { prompt: 'lion mane style', title: 'Lion Hairstyle', expected: 'hairstyles,animal' },
  { prompt: 'hairstyle', title: 'Generic Hairstyle', expected: 'hairstyles' },
  { prompt: 'cool haircut', title: 'Haircut Style', expected: 'hairstyles' },
];

console.log('\n=== Testing Tag Extraction ===\n');

testCases.forEach(({ prompt, title, expected }) => {
  const result = extractHairstyleTags(prompt, title);
  const passed = result === expected;
  const status = passed ? '✅' : '❌';
  
  console.log(`${status} Prompt: "${prompt}"`);
  console.log(`   Title: "${title}"`);
  console.log(`   Expected: "${expected}"`);
  console.log(`   Got: "${result}"`);
  console.log('');
});

console.log('=== Test Complete ===\n');
