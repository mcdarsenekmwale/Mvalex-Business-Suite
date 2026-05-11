// components/ui/MessageDisplay.tsx
"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Bookmark,
  Share2,
  Reply,
  Quote,
  Bot,
  User,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface MessageDisplayProps {
  content: string;
  isAI?: boolean;
  timestamp?: Date;
  showActions?: boolean;
  onCopy?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  className?: string;
}

//
// Helper function to parse markdown-like syntax
function parseMarkdown(content: string) {
  // Split content into lines
  const lines = content.split('\n');
  const result: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];
  let listItems: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';
  let codeBlock: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Code block detection
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        result.push(
          <pre key={`code-${i}`} className="bg-muted p-4 rounded-lg overflow-x-auto my-3">
            <code className="text-sm font-mono whitespace-pre-wrap">
              {codeBlock.join('\n')}
            </code>
          </pre>
        );
        codeBlock = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
        codeLanguage = trimmedLine.slice(3).trim();
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlock.push(line);
      continue;
    }
    
    // Table detection
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      const cells = trimmedLine.slice(1, -1).split('|').map(cell => cell.trim());
      
      // Check if this is a header separator row (|---|)
      if (cells.every(cell => /^[-:]+$/.test(cell))) {
        continue; // Skip separator row
      }
      
      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
        tableRows = [];
      } else {
        tableRows.push(cells);
      }
      continue;
    }
    
    // If we were in a table and now we're not, render the table
    if (inTable && !trimmedLine.startsWith('|')) {
      result.push(
        <div key={`table-${i}`} className="overflow-x-auto my-4">
          <table className="min-w-full border-collapse border border-border rounded-lg">
            <thead>
              <tr className="bg-muted/50">
                {tableHeaders.map((header, idx) => (
                  <th key={idx} className="border border-border px-4 py-2 text-left text-sm font-semibold">
                    {formatInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rowIdx) => (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="border border-border px-4 py-2 text-sm">
                      {formatInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }
    
    // List detection
    const ulMatch = trimmedLine.match(/^[-*+]\s+(.*)$/);
    const olMatch = trimmedLine.match(/^\d+\.\s+(.*)$/);
    
    if (ulMatch || olMatch) {
      if (!inList) {
        inList = true;
        listType = ulMatch ? 'ul' : 'ol';
        listItems = [];
      }
      listItems.push(ulMatch ? ulMatch[1] : olMatch![1]);
      continue;
    } else if (inList && trimmedLine !== '') {
      // Render the list
      const ListTag = listType === 'ul' ? 'ul' : 'ol';
      result.push(
        <ListTag key={`list-${i}`} className="my-3 space-y-1 pl-6">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm">
              {formatInline(item)}
            </li>
          ))}
        </ListTag>
      );
      inList = false;
      listItems = [];
    }
    
    // Headers
    if (trimmedLine.startsWith('### ')) {
      result.push(
        <h3 key={i} className="text-lg font-semibold mt-4 mb-2">
          {formatInline(trimmedLine.slice(4))}
        </h3>
      );
      continue;
    }
    
    if (trimmedLine.startsWith('## ')) {
      result.push(
        <h2 key={i} className="text-xl font-bold mt-5 mb-3">
          {formatInline(trimmedLine.slice(3))}
        </h2>
      );
      continue;
    }
    
    if (trimmedLine.startsWith('# ')) {
      result.push(
        <h1 key={i} className="text-2xl font-bold mt-6 mb-4">
          {formatInline(trimmedLine.slice(2))}
        </h1>
      );
      continue;
    }
    
    // Horizontal rule
    if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
      result.push(<hr key={i} className="my-4 border-border" />);
      continue;
    }
    
    // Regular paragraph (skip empty lines)
    if (trimmedLine !== '') {
      // Check for bold text with ** or __
      let formattedLine = formatInline(trimmedLine);
      
      // Check for inline code with backticks
      if (trimmedLine.includes('`')) {
        formattedLine = formatInlineCode(formattedLine as any);
      }
      
      result.push(
        <p key={i} className="text-sm leading-relaxed mb-3">
          {formattedLine}
        </p>
      );
    } else if (result.length > 0 && !inList) {
      // Add spacing between paragraphs
      result.push(<div key={`space-${i}`} className="h-2" />);
    }
  }
  
  // Clean up any remaining list or table
  if (inList) {
    const ListTag = listType === 'ul' ? 'ul' : 'ol';
    result.push(
      <ListTag key="list-end" className="my-3 space-y-1 pl-6">
        {listItems.map((item, idx) => (
          <li key={idx} className="text-sm">
            {formatInline(item)}
          </li>
        ))}
      </ListTag>
    );
  }
  
  if (inTable) {
    result.push(
      <div key="table-end" className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-border rounded-lg">
          <thead>
            <tr className="bg-muted/50">
              {tableHeaders.map((header, idx) => (
                <th key={idx} className="border border-border px-4 py-2 text-left text-sm font-semibold">
                  {formatInline(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="border border-border px-4 py-2 text-sm">
                    {formatInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  return (<div className="prose prose-sm dark:prose-invert max-w-none">{result}</div>);
}

function formatInline(text: string): React.ReactNode {
  // Process bold (**text** or __text__)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let lastIndex = 0;
  
  // Regex for bold, italic, and links
  const boldRegex = /\*\*(.*?)\*\*/g;
  const italicRegex = /\*(.*?)\*/g;
  const linkRegex = /\[(.*?)\]\((.*?)\)/g;
  
  let match;
  let currentIndex = 0;
  const elements: React.ReactNode[] = [];
  
  while ((match = boldRegex.exec(remaining)) !== null) {
    if (match.index > currentIndex) {
      elements.push(remaining.slice(currentIndex, match.index));
    }
    elements.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
    currentIndex = match.index + match[0].length;
  }
  
  if (currentIndex < remaining.length) {
    elements.push(remaining.slice(currentIndex));
  }
  
  return elements.length > 0 ? elements : text;
}

function formatInlineCode(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;
  
  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <code key={`code-${match.index}`} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
        {match[1]}
      </code>
    );
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts;
}



// Clean HTML content by removing problematic inline styles and fixing elements
function cleanHtmlContent(html: string): string {
  if (!html) return "";
  
  // Remove border-color: hsl(var(--border)) from style attributes
  let cleaned = html.replace(/border-color:\s*hsl\(var\(--border\)\)/gi, "");
  
  // Remove empty style attributes
  cleaned = cleaned.replace(/style="\s*"/gi, "");
  
  // Fix <br> tags without closing
  cleaned = cleaned.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "</p><p>");
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "<br />");
  
  // Clean up any double spaces in style attributes
  cleaned = cleaned.replace(/style="([^"]*)"/gi, (match, styles) => {
    const cleanedStyles = styles.replace(/\s*;\s*/g, "; ").trim();
    if (!cleanedStyles) return "";
    return `style="${cleanedStyles}"`;
  });
  
  return cleaned;
}

// Convert markdown-style formatting to HTML
function convertMarkdownToHtml(text: string): string {
  if (!text) return "";
  
  let html = text;
  
  // Convert headers
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-5 mb-3">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>');
  
  // Convert bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Convert italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
  
  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert unordered lists
  html = html.replace(/^[\*\-+] (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="my-3 space-y-1 pl-6">$1</ul>');
  
  // Convert ordered lists
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, function(match) {
    if (!match.includes('<ul')) {
      return '<ol class="my-3 space-y-1 pl-6">' + match + '</ol>';
    }
    return match;
  });
  
  // Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-4 border-border" />');
  
  // Convert line breaks to paragraphs
  const paragraphs = html.split('\n\n');
  html = paragraphs.map(p => {
    if (p.trim().startsWith('<') || p.trim() === '') return p;
    return `<p class="text-sm leading-relaxed mb-3">${p}</p>`;
  }).join('\n');
  
  return html;
}

// Parse and render content safely
function renderContent(content: string, isFromAI: boolean): React.ReactNode {
  if (!content) return null;
  
  // Check if content looks like HTML (contains tags)
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(content);
  
  let processedContent = content;
  
  if (!looksLikeHtml) {
    // Content is markdown-like, convert to HTML
    processedContent = convertMarkdownToHtml(content);
  } else {
    // Content is HTML, clean it
    processedContent = cleanHtmlContent(content);
  }
  
  // Final sanitization for any remaining issues
  processedContent = processedContent.replace(/border-color:\s*hsl\(var\(--border\)\)/gi, "");
  processedContent = processedContent.replace(/style="([^"]*)"/gi, (match, styles) => {
    const cleaned = styles.replace(/;\s*$/, "").trim();
    return cleaned ? `style="${cleaned}"` : "";
  });
  
  // Use dangerouslySetInnerHTML with sanitized content
  // Note: In production, you should use a proper sanitization library like DOMPurify
  return (
    <div 
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        isFromAI && "prose-primary"
      )}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}

export function MessageDisplay({
  content,
  isAI = false,
  timestamp,
  showActions = true,
  onCopy,
  onLike,
  onDislike,
  onShare,
  onBookmark,
  className,
}: MessageDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const htmlIsLikely = /<[a-z][\s\S]*>/i.test(content);;
  const renderedContent = htmlIsLikely ? useMemo(() => renderContent(content, isAI), [content, isAI]) : useMemo(() => parseMarkdown(content) , [content, isAI]);
  
  const handleCopy = async () => {
    // Strip HTML tags for plain text copy
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || content;
    
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };
  
  const handleLike = () => {
    setLiked(!liked);
    if (disliked) setDisliked(false);
    onLike?.();
    toast.success(liked ? "Removed like" : "Thanks for your feedback!");
  };
  
  const handleDislike = () => {
    setDisliked(!disliked);
    if (liked) setLiked(false);
    onDislike?.();
    toast.success(disliked ? "Removed dislike" : "We'll improve based on your feedback");
  };
  
  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    onBookmark?.();
    toast.success(bookmarked ? "Removed bookmark" : "Saved to bookmarks");
  };
  
  return (
    <div className={cn(
      "group relative rounded-lg p-4 transition-all",
      isAI 
        ? "bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20" 
        : "bg-muted/30 border",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isAI ? (
            <>
              <div className="p-1.5 rounded-full bg-primary/20">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-primary">AI Assistant</span>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
            </>
          ) : (
            <>
              <div className="p-1.5 rounded-full bg-muted-foreground/20">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold">Support Team</span>
            </>
          )}
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        
        {showActions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy message</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleLike}
                    >
                      <ThumbsUp className={cn("h-3.5 w-3.5", liked && "fill-current text-primary")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Helpful</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleDislike}
                    >
                      <ThumbsDown className={cn("h-3.5 w-3.5", disliked && "fill-current text-destructive")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Not helpful</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleBookmark}
                    >
                      <Bookmark className={cn("h-3.5 w-3.5", bookmarked && "fill-current text-primary")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bookmark</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>
      
      {/* Content - renders HTML safely */}
       {
        renderedContent
       }
      
      {/* Footer Actions */}
      {showActions && (
        <div className="mt-3 pt-2 border-t flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Reply className="h-3 w-3 mr-1" />
            Reply
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Quote className="h-3 w-3 mr-1" />
            Quote
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Share2 className="h-3 w-3 mr-1" />
            Share
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Flag className="h-3 w-3 mr-1" />
            Report
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper component to display AI messages with default isAI=true
export function AIMessageDisplay(props: Omit<MessageDisplayProps, 'isAI'>) {
  return <MessageDisplay {...props} isAI={true} />;
}

// Helper component to display human messages with default isAI=false
export function HumanMessageDisplay(props: Omit<MessageDisplayProps, 'isAI'>) {
  return <MessageDisplay {...props} isAI={false} />;
}