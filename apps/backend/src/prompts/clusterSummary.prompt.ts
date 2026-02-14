export const getClusterSummaryPrompt = (articles: { title: string; content: string; source: string }[]) => {
  const articlesText = articles
    .map((a, i) => `Article ${i + 1}:\nTitle: ${a.title}\nSource: ${a.source}\nContent: ${a.content}\n`)
    .join('\n---\n');

  return `
You are an expert intelligence analyst. Your task is to synthesize a brief, high-quality summary of a group of related articles.
This summary will be part of a daily intelligence briefing.

Here are the articles in this cluster:
${articlesText}

Instructions:
1. Identify the core event or topic that unifies these articles.
2. Write a concise title for this topic (max 10 words).
3. Write a summary paragraph (100-200 words) that synthesizes the key facts, developments, and implications.
4. Do not just list the articles; synthesize the information.
5. Highlight any conflicting information or diverse perspectives if present.
6. Return the result in the following JSON format:
{
  "topic_title": "...",
  "summary": "...",
  "key_points": ["point 1", "point 2", "point 3"]
}
`;
};
