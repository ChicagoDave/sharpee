params: {
  items: {
    kind: 'list' as const,
    conj: 'and' as const,
    items: visible.map(e => nounPhraseFor(e)),
  },
}
