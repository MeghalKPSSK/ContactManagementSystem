import type { NoteFontFamily } from '../types';

export const NOTE_FONT_STACKS: Record<NoteFontFamily, string> = {
  handwritten: "'Brush Script MT', cursive, sans-serif",
  sans: 'Avenir Next, Avenir, sans-serif',
  serif: 'Georgia, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  rounded: 'Avenir Next, Trebuchet MS, sans-serif',
  humanist: 'Gill Sans, Calibri, sans-serif',
  book: 'Palatino, Book Antiqua, serif',
  editorial: 'Didot, Bodoni MT, serif',
  geometric: 'Futura, Century Gothic, sans-serif',
  cursive: 'Apple Chancery, cursive',
  slab: 'Rockwell, Georgia, serif',
  system: 'system-ui, sans-serif',
};

export const NOTE_FONT_OPTIONS: Array<{ value: NoteFontFamily; label: string }> = [
  { value: 'handwritten', label: 'Handwritten' },
  { value: 'sans', label: 'Avenir Sans' },
  { value: 'serif', label: 'Georgia Serif' },
  { value: 'mono', label: 'Monospace' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'humanist', label: 'Humanist' },
  { value: 'book', label: 'Book' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'geometric', label: 'Geometric' },
  { value: 'cursive', label: 'Cursive' },
  { value: 'slab', label: 'Slab Serif' },
  { value: 'system', label: 'System' },
];