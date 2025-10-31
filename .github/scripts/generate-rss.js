const fs = require('fs');
const path = require('path');

// Read the blogs.json file
const blogsPath = path.join(__dirname, '../../files/blogs.json');
const blogs = JSON.parse(fs.readFileSync(blogsPath, 'utf8'));

// Sort blogs by date (newest first)
blogs.sort((a, b) => {
  const parseDate = (dateStr) => {
    const parts = dateStr.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
  };
  return parseDate(b.date) - parseDate(a.date);
});

// Format date to RFC 822 format (required for RSS)
function formatDateRFC822(dateStr) {
  const parts = dateStr.split('/');
  const date = new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0);
  return date.toUTCString();
}

// Escape XML special characters
function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Convert markdown-style formatting to plain text for RSS
function stripMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links but keep text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/_([^_]+)_/g, '$1') // Remove underline
    .replace(/~~([^~]+)~~/g, '$1') // Remove strikethrough
    .replace(/\\n/g, '\n'); // Convert \n to actual newlines
}

// Generate RSS feed
const rssItems = blogs.map(blog => {
  const description = escapeXml(stripMarkdown(blog.content));
  const title = escapeXml(blog.title);
  const link = `https://devicals.github.io/#blog?id=${blog.id}`;
  
  return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${formatDateRFC822(blog.date)}</pubDate>
      <description>${description}</description>
    </item>`;
}).join('\n');

const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Error Dev's Blog</title>
    <link>https://devicals.github.io/</link>
    <description>Blog posts from Error Dev's website</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://devicals.github.io/feed.xml" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

// Write the RSS feed to feed.xml in the root directory
const outputPath = path.join(__dirname, '../../feed.xml');
fs.writeFileSync(outputPath, rssFeed, 'utf8');

console.log('RSS feed generated successfully at feed.xml');