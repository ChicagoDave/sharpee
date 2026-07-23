/**
 * /playground — the "Play It Now" in-browser Chord playground (ADR-191 Phase 1).
 *
 * A sibling to /play (which stays the curated Fernhill demo): here the reader
 * writes their OWN Chord story and runs it, compiled client-side. Full-width
 * (editor + player side by side), so it does not use the narrow DocPage column.
 *
 * Owner: website (not the platform workspace).
 */
import type { Metadata } from 'next';
import { PlaygroundClient } from './playground-client';

export const metadata: Metadata = {
  title: 'Play It Now — Sharpee Playground',
  description: 'Write a Chord story and run it in your browser — no install, no backend.',
};

export default function Page() {
  return (
    <div className="min-w-0 px-6 py-8 sm:px-10">
      <div className="mb-2 text-[13px] text-muted">Play / Playground</div>
      <h1 className="mb-2 text-[28px] font-bold">Play It Now</h1>
      <p className="mb-5 max-w-[720px] text-[15px] text-muted">
        Write a Chord story on the left and press <strong className="text-ink">Play</strong> — it
        compiles in your browser and runs on the right. No install, and nothing is sent to a server.
      </p>
      <PlaygroundClient />
    </div>
  );
}
