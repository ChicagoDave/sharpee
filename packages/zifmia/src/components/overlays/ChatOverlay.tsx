/**
 * ChatOverlay - iMessage-style chat rendering overlay
 *
 * Renders transcript entries as chat bubbles. Blocks are routed by key:
 * - narration.{characterId} → character bubbles (Phase 3)
 * - action.* → attributed to current PC
 * - room.*, error, game.* → system bubbles (centered, muted)
 *
 * Falls back to SystemBubble for entries without blocks (system messages, pre-blocks saves).
 */

import React, { useRef, useEffect } from 'react';
import { useGameState } from '../../context/GameContext';
import { CommandInput } from '../transcript/CommandInput';
import { renderToString } from '@sharpee/text-service';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { TranscriptEntry } from '../../types/game-state';

interface ChatOverlayProps {
  config?: Record<string, unknown>;
}

interface ChatMessage {
  characterId: string | null;
  blocks: ITextBlock[];
  type: 'narration' | 'action' | 'system';
}

export function ChatOverlay({ config }: ChatOverlayProps) {
  const { transcript } = useGameState();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [transcript]);

  return (
    <div className="chat-overlay">
      <div className="chat-messages" ref={scrollRef}>
        {transcript.map(entry => (
          <ChatTurn key={entry.id} entry={entry} />
        ))}
      </div>
      <div className="chat-input-area">
        <CommandInput placeholder="Type a command..." />
      </div>
    </div>
  );
}

function ChatTurn({ entry }: { entry: TranscriptEntry }) {
  if (!entry.blocks) {
    // Fallback: system messages, pre-blocks saves, annotation entries
    return <SystemBubble text={entry.text} />;
  }

  const messages = routeBlocksToMessages(entry.blocks);

  return (
    <>
      {entry.command && <CommandBubble command={entry.command} />}
      {messages.map((msg, i) =>
        msg.type === 'system'
          ? <SystemBubble key={i} text={renderToString(msg.blocks)} />
          : <ChatBubble key={i} message={msg} />
      )}
    </>
  );
}

function SystemBubble({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div
      className="system-bubble"
      dangerouslySetInnerHTML={{ __html: formatText(text) }}
    />
  );
}

function CommandBubble({ command }: { command: string }) {
  return <div className="command-bubble">{command}</div>;
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const text = renderToString(message.blocks);
  const alignment = 'left'; // Phase 3: isPC ? 'right' : 'left'

  return (
    <div className={`chat-bubble chat-bubble--${alignment}`}>
      <div className="chat-bubble__content">
        <div
          className="chat-bubble__text"
          dangerouslySetInnerHTML={{ __html: formatText(text) }}
        />
      </div>
    </div>
  );
}

/**
 * Route blocks to chat messages by key prefix.
 * Groups consecutive blocks from the same character.
 */
function routeBlocksToMessages(blocks: ITextBlock[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  let current: ChatMessage | null = null;

  for (const block of blocks) {
    // Skip status blocks (rendered elsewhere)
    if (block.key.startsWith('status.')) continue;

    // Extract character from narration key: "narration.thief" → "thief"
    const match = block.key.match(/^narration\.(\w+)$/);
    const charId = match?.[1] ?? null;

    // Action results attributed to current PC (Phase 3 wires actual PC ID)
    const isAction = block.key.startsWith('action.');
    const effectiveCharId = isAction ? '' : charId;

    // System blocks: room.*, error, game.*, anything without a character
    const isSystem = effectiveCharId === null;

    // Group consecutive blocks from the same source
    if (current && current.characterId === effectiveCharId) {
      current.blocks.push(block);
    } else {
      current = {
        characterId: effectiveCharId,
        blocks: [block],
        type: isSystem ? 'system' : isAction ? 'action' : 'narration',
      };
      messages.push(current);
    }
  }

  return messages;
}

/**
 * Format game text for display.
 * Converts newlines to <br> and preserves paragraph breaks.
 */
function formatText(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs
    .map(p => {
      const lines = p.split('\n').join('<br>');
      return `<p>${lines}</p>`;
    })
    .join('');
}
