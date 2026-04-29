/**
 * Extract tags from prompt text based on keywords
 * @param prompt - The prompt text to analyze
 * @param baseTag - The base tag to always include (e.g., "hairstyles")
 * @returns Comma-separated tags string
 */
export function extractTagsFromPrompt(prompt: string, baseTag: string): string {
  if (!prompt) {
    return baseTag;
  }

  const lowerPrompt = prompt.toLowerCase();
  const tags = [baseTag];

  // Define keyword patterns for different categories
  const categoryKeywords = {
    men: ['men', 'man', 'male', 'boy', 'gentleman', 'guy', 'masculine'],
    women: ['women', 'woman', 'female', 'girl', 'lady', 'feminine'],
    animal: ['animal', 'cat', 'dog', 'lion', 'tiger', 'bear', 'wolf', 'fox', 'pet', 'poodle', 'giraffe', 'zebra'],
  };

  // Check for each category
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    // Use word boundary to avoid partial matches
    // e.g., "women" should not match when checking for "men"
    const hasKeyword = keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerPrompt);
    });

    if (hasKeyword) {
      tags.push(category);
    }
  }

  return tags.join(',');
}

/**
 * Smart tag extraction for hairstyles specifically
 * @param prompt - The prompt text
 * @param title - The title text (optional, for additional context)
 * @returns Tags string like "hairstyles,men" or "hairstyles,women" or just "hairstyles"
 */
export function extractHairstyleTags(prompt: string, title?: string): string {
  const combinedText = [prompt, title].filter(Boolean).join(' ');
  return extractTagsFromPrompt(combinedText, 'hairstyles');
}
