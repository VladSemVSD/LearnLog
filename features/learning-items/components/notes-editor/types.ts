/**
 * Public contract for the notes editor. The Phase 2 implementation is a
 * Tiptap-backed WYSIWYG that serializes to markdown. The interface is held
 * stable so we can later swap in an AI-driven editor (e.g., URL → generated
 * notes) by adding a sibling impl and changing the re-export in `./index.tsx`.
 */
export type NotesEditorProps = {
  /** Markdown string. */
  value: string;
  /** Called on every edit; receives the new markdown string. */
  onChange: (markdown: string) => void;
  placeholder?: string;
  /** When true, the editor is read-only (used during save transitions). */
  disabled?: boolean;
};
