/**
 * ChatOverlay - iMessage-style chat rendering overlay
 *
 * Renders transcript entries as chat bubbles. Blocks are routed by key:
 * - narration.{characterId} → character bubbles with name/color/avatar
 * - action.* → attributed to current PC (right-aligned)
 * - room.*, error, game.* → system bubbles (centered, muted)
 *
 * Falls back to SystemBubble for entries without blocks (system messages, pre-blocks saves).
 */

import React, { useRef, useEffect } from 'react';
import { useGameState } from '../../context/GameContext';
import { useCurrentPc } from '../../hooks/useCurrentPc';
import { CommandInput } from '../transcript/CommandInput';
import { renderToString } from '@sharpee/text-service';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { TranscriptEntry } from '../../types/game-state';

// -- Types --

interface ChatOverlayProps {
  config?: Record<string, unknown>;
}

interface CharacterConfig {
  name: string;
  shortName: string;
  color: string;
  avatar?: string;
  alignment: 'pc' | 'npc';
}

type CharacterMap = Record<string, CharacterConfig>;

interface ChatMessage {
  characterId: string | null;
  blocks: ITextBlock[];
  type: 'narration' | 'action' | 'system';
}

interface ChatTurnProps {
  entry: TranscriptEntry;
  characters: CharacterMap;
  currentPcId: string;
}

interface ChatBubbleProps {
  message: ChatMessage;
  character?: CharacterConfig;
  isPC: boolean;
  sameSpeaker: boolean;
}

// -- Components --

export function ChatOverlay({ config }: ChatOverlayProps) {
  const { transcript } = useGameState();
  const currentPcId = useCurrentPc();
  const characters = (config?.characters ?? {}) as CharacterMap;
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
          <ChatTurn
            key={entry.id}
            entry={entry}
            characters={characters}
            currentPcId={currentPcId}
          />
        ))}
      </div>
      <div className="chat-input-area">
        <CommandInput placeholder="Type a command..." />
      </div>
    </div>
  );
}

function ChatTurn({ entry, characters, currentPcId }: ChatTurnProps) {
  if (!entry.blocks) {
    // Fallback: system messages, pre-blocks saves, annotation entries
    return <SystemBubble text={entry.text} />;
  }

  // Check for PC switch in this entry's events
  const switchEvent = entry.events?.find(e => e.type === 'game.pc_switched');
  const newPcName = switchEvent
    ? characters[(switchEvent.data as { newPlayerId: string }).newPlayerId]?.name ?? 'someone else'
    : null;

  const messages = routeBlocksToMessages(entry.blocks, currentPcId);

  return (
    <>
      {newPcName && <SystemBubble text={`You are now ${newPcName}.`} />}
      {entry.command && <CommandBubble command={entry.command} />}
      {messages.map((msg, i) => {
        const prevMsg = i > 0 ? messages[i - 1] : null;
        const sameSpeaker = !!(prevMsg && prevMsg.characterId === msg.characterId && prevMsg.type !== 'system');

        return msg.type === 'system'
          ? <SystemBubble key={i} text={renderToString(msg.blocks)} />
          : <ChatBubble
              key={i}
              message={msg}
              character={characters[msg.characterId ?? '']}
              isPC={msg.characterId === currentPcId}
              sameSpeaker={sameSpeaker}
            />;
      })}
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

function ChatBubble({ message, character, isPC, sameSpeaker }: ChatBubbleProps) {
  const text = renderToString(message.blocks);
  const alignment = isPC ? 'right' : 'left';
  const classes = [
    'chat-bubble',
    `chat-bubble--${alignment}`,
    sameSpeaker ? 'chat-bubble--same-speaker' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {!isPC && character?.avatar && (
        <img className="chat-avatar" src={character.avatar} alt={character.shortName} />
      )}
      <div className="chat-bubble__content" style={{ borderColor: character?.color }}>
        {character && (
          <div className="chat-bubble__name" style={{ color: character.color }}>
            {character.shortName}
          </div>
        )}
        <div
          className="chat-bubble__text"
          dangerouslySetInnerHTML={{ __html: formatText(text) }}
        />
      </div>
    </div>
  );
}

// -- Utilities --

/**
 * Route blocks to chat messages by key prefix.
 * Groups consecutive blocks from the same character.
 */
function routeBlocksToMessages(blocks: ITextBlock[], currentPcId: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  let current: ChatMessage | null = null;

  for (const block of blocks) {
    // Skip status blocks (rendered elsewhere)
    if (block.key.startsWith('status.')) continue;

    // Extract character from narration key: "narration.thief" → "thief"
    const match = block.key.match(/^narration\.(\w+)$/);
    const charId = match?.[1] ?? null;

    // Action results attributed to current PC
    const isAction = block.key.startsWith('action.');
    const effectiveCharId = isAction ? (currentPcId || null) : charId;

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
