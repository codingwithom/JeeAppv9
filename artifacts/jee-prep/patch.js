const fs = require('fs');
const file = '/workspaces/JeeAppv9/artifacts/jee-prep/src/pages/QuizPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const preprocessFunc = `const preprocessMarkdown = (text: string) => {
  if (!text) return text;
  return text.replace(/<Image\\s+([^>]+)\\/?>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    const altMatch = attrs.match(/alt=["']([^"']+)["']/i);
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    const captionMatch = attrs.match(/caption=["']([^"']+)["']/i);
    
    if (!srcMatch) return match;
    const src = srcMatch[1];
    const alt = altMatch ? altMatch[1] : 'Image';
    const href = hrefMatch ? hrefMatch[1] : '';
    const caption = captionMatch ? captionMatch[1] : '';

    let md = `![${alt}](${src})`;
    if (href) {
      md = `[${md}](${href})`;
    }
    if (caption) {
      md += `\\n*${caption}*\\n`;
    }
    return md;
  });
};

const getMarkdownComponents = (setFullScreenImage?: (url: string) => void): any => ({
`;

content = content.replace('const getMarkdownComponents = (setFullScreenImage?: (url: string) => void): any => ({', preprocessFunc);

// Line 961
content = content.replace(
  '<ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={getMarkdownComponents(setFullScreenImage)}>{displayed}</ReactMarkdown>',
  '<ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={getMarkdownComponents(setFullScreenImage)}>{preprocessMarkdown(displayed)}</ReactMarkdown>'
);

// Line 1726ish (m.content)
content = content.replace(
  /<ReactMarkdown remarkPlugins={\\[remarkMath, remarkGfm\\]} rehypePlugins={\\[rehypeKatex\\]} components={getMarkdownComponents\\(setFullScreenImage\\)}>\s*\\{m\\.content\\}\\s*<\/ReactMarkdown>/g,
  `<ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={getMarkdownComponents(setFullScreenImage)}>\n                         {preprocessMarkdown(m.content)}\n                       </ReactMarkdown>`
);

// Line 2533ish (questions[currentIndex].text)
content = content.replace(
  "<ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{questions[currentIndex].text}</ReactMarkdown>",
  "<ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{preprocessMarkdown(questions[currentIndex].text)}</ReactMarkdown>"
+);

// Line 2541ish
content = content.replace(
  '<ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={{ p: ({node, ...props}) => <span {...props} /> }}>{`(${String.fromCharCode(65 + i)}) ${opt}`}</ReactMarkdown>',
  '<ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={{ p: ({node, ...props}) => <span {...props} /> }}>{preprocessMarkdown(`(${String.fromCharCode(65 + i)}) ${opt}`)}</ReactMarkdown>'
);

fs.writeFileSync(file, content);
console.log("Patch applied");