// components/ui/rich-text-editor.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Code,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder, 
  minHeight = 150,
  className = ""
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const ignoreNextInput = useRef(false);

  // Save cursor position before any operation
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      return { range, selection };
    }
    return null;
  }, []);

  // Restore cursor position after operation
  const restoreSelection = useCallback((savedSelection: { range: Range; selection: Selection } | null) => {
    if (savedSelection && editorRef.current) {
      const newSelection = window.getSelection();
      if (newSelection) {
        newSelection.removeAllRanges();
        newSelection.addRange(savedSelection.range);
      }
    }
  }, []);

  // Execute command with cursor preservation
  const execCommand = useCallback((command: string, value?: string) => {
    const savedSelection = saveSelection();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      if (newContent !== value) {
        ignoreNextInput.current = true;
        onChange(newContent);
      }
      editorRef.current.focus();
    }
    if (savedSelection) {
      restoreSelection(savedSelection);
    }
  }, [onChange, saveSelection, restoreSelection, value]);

  // Handle input events without losing cursor
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (ignoreNextInput.current) {
      ignoreNextInput.current = false;
      return;
    }
    const newContent = e.currentTarget.innerHTML;
    if (newContent !== value) {
      onChange(newContent);
    }
  }, [onChange, value]);

  // Handle paste with formatting preservation
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const savedSelection = saveSelection();
    
    // Get plain text and HTML
    const plainText = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');
    
    // Use HTML if available, otherwise wrap plain text in paragraphs
    if (html) {
      document.execCommand('insertHTML', false, html);
    } else {
      // Convert line breaks to <p> tags for better formatting
      const formattedText = plainText.split('\n').map(para => {
        if (para.trim()) return `<p>${para}</p>`;
        return '<br/>';
      }).join('');
      document.execCommand('insertHTML', false, formattedText);
    }
    
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      if (newContent !== value) {
        ignoreNextInput.current = true;
        onChange(newContent);
      }
    }
    
    if (savedSelection) {
      restoreSelection(savedSelection);
    }
  }, [onChange, saveSelection, restoreSelection, value]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      execCommand('bold');
    }
    // Ctrl/Cmd + I for italic
    else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      execCommand('italic');
    }
    // Ctrl/Cmd + U for underline
    else if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      execCommand('underline');
    }
    // Ctrl/Cmd + Z for undo
    else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      execCommand('undo');
    }
    // Ctrl/Cmd + Y for redo
    else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      execCommand('redo');
    }
    // Ctrl/Cmd + Shift + Z for redo (alternative)
    else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') {
      e.preventDefault();
      execCommand('redo');
    }
    // Enter key - ensure new paragraph
    else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      execCommand('insertParagraph');
    }
  }, [execCommand]);

  // Format heading
  const formatHeading = useCallback((level: number) => {
    const savedSelection = saveSelection();
    const html = `<h${level}>${window.getSelection()?.toString() || ''}</h${level}>`;
    document.execCommand('insertHTML', false, html);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      if (newContent !== value) {
        ignoreNextInput.current = true;
        onChange(newContent);
      }
      editorRef.current.focus();
    }
    if (savedSelection) {
      restoreSelection(savedSelection);
    }
  }, [onChange, saveSelection, restoreSelection, value]);

  // Insert horizontal rule
  const insertHorizontalRule = useCallback(() => {
    execCommand('insertHorizontalRule');
  }, [execCommand]);

  // Format blockquote
  const formatBlockquote = useCallback(() => {
    execCommand('formatBlock', 'blockquote');
  }, [execCommand]);

  // Format code block
  const formatCode = useCallback(() => {
    execCommand('formatBlock', 'pre');
  }, [execCommand]);

  // Initialize editor content on mount
  useEffect(() => {
    setIsMounted(true);
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '<p><br></p>';
    }
  }, []);

  // Update content when value changes externally
  useEffect(() => {
    if (isMounted && editorRef.current && !ignoreNextInput.current) {
      const currentContent = editorRef.current.innerHTML;
      if (value !== currentContent) {
        const savedSelection = saveSelection();
        editorRef.current.innerHTML = value || '<p><br></p>';
        if (savedSelection) {
          restoreSelection(savedSelection);
        }
      }
    }
  }, [value, isMounted, saveSelection, restoreSelection]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  return (
    <div className={cn(
      "border rounded-md overflow-hidden transition-colors bg-background",
      isFocused ? "border-primary ring-1 ring-primary" : "border-input"
    )}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 sticky top-0 z-10">
        <TooltipProvider>
          {/* Undo/Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('undo')}
                className="h-8 w-8 p-0"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('redo')}
                className="h-8 w-8 p-0"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Formatting */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('bold')}
                className="h-8 w-8 p-0"
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bold (Ctrl+B)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('italic')}
                className="h-8 w-8 p-0"
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic (Ctrl+I)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('underline')}
                className="h-8 w-8 p-0"
              >
                <Underline className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Underline (Ctrl+U)</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Headings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => formatHeading(1)}
                className="h-8 w-8 p-0 text-xs font-bold"
              >
                H1
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 1</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => formatHeading(2)}
                className="h-8 w-8 p-0 text-xs font-bold"
              >
                H2
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 2</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => formatHeading(3)}
                className="h-8 w-8 p-0 text-xs font-bold"
              >
                H3
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 3</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Lists */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('insertUnorderedList')}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bullet List</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('insertOrderedList')}
                className="h-8 w-8 p-0"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Numbered List</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Alignment */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('justifyLeft')}
                className="h-8 w-8 p-0"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Left</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('justifyCenter')}
                className="h-8 w-8 p-0"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Center</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => execCommand('justifyRight')}
                className="h-8 w-8 p-0"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Right</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Blocks */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatBlockquote}
                className="h-8 w-8 p-0"
              >
                <Quote className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Quote</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatCode}
                className="h-8 w-8 p-0"
              >
                <Code className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Code Block</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={insertHorizontalRule}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Horizontal Line</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Links */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = prompt('Enter URL:', 'https://');
                  if (url) execCommand('createLink', url);
                }}
                className="h-8 w-8 p-0"
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Insert Link</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className={cn("p-3 outline-none prose prose-sm max-w-none dark:prose-invert ${className}", className)}
        
        style={{ minHeight: `${minHeight}px` }}
        suppressContentEditableWarning
      />
      
      {/* Placeholder */}
      {!value?.replace(/<[^>]*>/g, '').trim() && !isFocused && (
        <div className="absolute  text-muted-foreground text-sm p-3 pointer-events-none -mt-[9em]">
          {placeholder || "Type your response here..."}
        </div>
      )}
    </div>
  );
}