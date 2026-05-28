'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { useState, useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks,
  Quote, Code, CodeSquare,
  ImagePlus, RemoveFormatting,
  Undo2, Redo2, Maximize, Minimize,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter,
} from 'lucide-react';

/* ── Toolbar Button ────────────────────────────── */
function ToolBtn({ onClick, active = false, disabled = false, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors
        ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />;
}

/* ── Image Dialog ──────────────────────────────── */
function ImageDialog({ onInsert, onClose }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onInsert(url.trim());
      setUrl('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg p-5 w-[90%] max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">插入图片</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="输入图片 URL，如 https://example.com/photo.jpg"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 mb-3"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50">
              取消
            </button>
            <button type="submit" className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              插入
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Editor Component ─────────────────────── */
export default function RichTextEditor({ initialContent = '', onChange, placeholder = '开始写作...' }) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: true }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
    ],
    content: initialContent || '',
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose max-w-none min-h-[300px] px-3 py-2 focus:outline-none',
      },
    },
  });

  // Sync external content changes (e.g. when switching between new/edit)
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const current = editor.getHTML();
      if (initialContent !== current) {
        editor.commands.setContent(initialContent || '');
      }
    }
  }, [initialContent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageInsert = useCallback((url) => {
    editor?.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  if (!editor) return <div className="h-[400px] bg-gray-50 rounded-lg animate-pulse" />;

  const iconSize = 16;

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white flex flex-col' : ''}`}>
      {/* ── Toolbar ───────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border border-b-0 border-gray-200 rounded-t-lg bg-gray-50/80">
        {/* Undo / Redo */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="撤销">
          <Undo2 size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="重做">
          <Redo2 size={iconSize} />
        </ToolBtn>

        <ToolbarDivider />

        {/* Headings */}
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="标题 1">
          <Heading1 size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="标题 2">
          <Heading2 size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="标题 3">
          <Heading3 size={iconSize} />
        </ToolBtn>

        <ToolbarDivider />

        {/* Text formatting */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="加粗">
          <Bold size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体">
          <Italic size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下划线">
          <UnderlineIcon size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="删除线">
          <Strikethrough size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="高亮">
          <Highlighter size={iconSize} />
        </ToolBtn>

        <ToolbarDivider />

        {/* Lists */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="无序列表">
          <List size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="有序列表">
          <ListOrdered size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="任务列表">
          <ListChecks size={iconSize} />
        </ToolBtn>

        <ToolbarDivider />

        {/* Block elements */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="引用">
          <Quote size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="代码块">
          <CodeSquare size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="行内代码">
          <Code size={iconSize} />
        </ToolBtn>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="左对齐">
          <AlignLeft size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="居中">
          <AlignCenter size={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="右对齐">
          <AlignRight size={iconSize} />
        </ToolBtn>

        <ToolbarDivider />

        {/* Image */}
        <ToolBtn onClick={() => setShowImageDialog(true)} title="插入图片">
          <ImagePlus size={iconSize} />
        </ToolBtn>

        {/* Clear format */}
        <ToolBtn onClick={() => editor.chain().focus().unsetAllMarks().run()} title="清除格式">
          <RemoveFormatting size={iconSize} />
        </ToolBtn>

        {/* Spacer + Fullscreen */}
        <div className="flex-1" />
        <ToolBtn onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? '退出全屏' : '全屏'}>
          {isFullscreen ? <Minimize size={iconSize} /> : <Maximize size={iconSize} />}
        </ToolBtn>
      </div>

      {/* ── Editor Content ────────────────── */}
      <div className={`border border-gray-200 ${isFullscreen ? 'flex-1 overflow-auto' : 'rounded-b-lg'}`}>
        <EditorContent editor={editor} className="min-h-[300px]" />
      </div>

      {/* ── Status Bar ────────────────────── */}
      <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-gray-400">
        <span>
          {editor.storage.characterCount?.words?.() ?? editor.getText().split(/\s+/).filter(Boolean).length} 字
          {' · '}
          {editor.getHTML().length} 字符
        </span>
        <span>{isFullscreen ? '按 Esc 退出全屏' : ''}</span>
      </div>

      {/* ── Image Dialog ──────────────────── */}
      {showImageDialog && (
        <ImageDialog
          onInsert={handleImageInsert}
          onClose={() => setShowImageDialog(false)}
        />
      )}

      {/* ── Fullscreen ESC handler ────────── */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsFullscreen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsFullscreen(false)}
          tabIndex={0}
          autoFocus
        />
      )}
    </div>
  );
}
