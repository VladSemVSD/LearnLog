"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { NotesEditorProps } from "./types";

export function TiptapEditor({
  value,
  onChange,
  placeholder,
  disabled,
}: NotesEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-2",
          },
        },
      }),
      Markdown.configure({
        html: false,
        linkify: true,
        breaks: true,
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "tiptap-content min-h-32 px-3 py-2.5 text-sm outline-none",
        ),
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate({ editor }) {
      // tiptap-markdown attaches getMarkdown() to editor.storage.markdown
      // without extending the Storage type — bypass via unknown.
      const storage = editor.storage as unknown as {
        markdown: { getMarkdown: () => string };
      };
      onChange(storage.markdown.getMarkdown());
    },
  });

  if (!editor) return null;

  return (
    <div
      className={cn(
        "border-border bg-background overflow-hidden rounded-lg border",
        disabled && "opacity-60",
      )}
    >
      <Toolbar editor={editor} disabled={disabled} />
      <Separator />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({
  editor,
  disabled,
}: {
  editor: ReturnType<typeof useEditor>;
  disabled?: boolean;
}) {
  if (!editor) return null;

  function toggle(action: () => boolean | void) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      action();
    };
  }

  return (
    <div className="bg-muted/40 flex flex-wrap items-center gap-0.5 p-1">
      <ToolbarButton
        active={editor.isActive("bold")}
        disabled={disabled}
        onClick={toggle(() => editor.chain().focus().toggleBold().run())}
        aria-label="Bold"
      >
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        disabled={disabled}
        onClick={toggle(() => editor.chain().focus().toggleItalic().run())}
        aria-label="Italic"
      >
        <Italic className="size-3.5" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton
        active={editor.isActive("heading", { level: 1 })}
        disabled={disabled}
        onClick={toggle(() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run(),
        )}
        aria-label="Heading 1"
      >
        <Heading1 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        disabled={disabled}
        onClick={toggle(() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        aria-label="Heading 2"
      >
        <Heading2 className="size-3.5" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton
        active={editor.isActive("bulletList")}
        disabled={disabled}
        onClick={toggle(() =>
          editor.chain().focus().toggleBulletList().run(),
        )}
        aria-label="Bullet list"
      >
        <List className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        disabled={disabled}
        onClick={toggle(() =>
          editor.chain().focus().toggleOrderedList().run(),
        )}
        aria-label="Ordered list"
      >
        <ListOrdered className="size-3.5" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton
        active={editor.isActive("link")}
        disabled={disabled}
        onClick={toggle(() => {
          const prev = (editor.getAttributes("link").href as string) ?? "";
          const url = window.prompt("Link URL", prev);
          if (url === null) return false;
          if (url === "") {
            return editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .unsetLink()
              .run();
          }
          const { from, to } = editor.state.selection;
          if (from === to) {
            return editor
              .chain()
              .focus()
              .insertContent({
                type: "text",
                text: url,
                marks: [{ type: "link", attrs: { href: url } }],
              })
              .run();
          }
          return editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
        })}
        aria-label="Link"
      >
        <LinkIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("codeBlock")}
        disabled={disabled}
        onClick={toggle(() => editor.chain().focus().toggleCodeBlock().run())}
        aria-label="Code block"
      >
        <Code className="size-3.5" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  ...props
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  "aria-label": string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
}
