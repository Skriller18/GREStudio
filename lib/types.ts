export type Word = { word: string; meaning: string; icon: string; scene: string; locus: string; n: number };
export type Palace = { id: number; title: string; words: Word[]; group: number; part: number; build: string; loci: string[]; icon: string };
export type Essay = { id: number; topic: string; instructions: string; slug: string; category: string; essay: string; word_count: number; status: string };
export type Question = { id: string; section: number; type: "single" | "multi" | "numeric"; stem: string; choices?: string[]; answer: string | string[]; explanation: string; passage?: string };
