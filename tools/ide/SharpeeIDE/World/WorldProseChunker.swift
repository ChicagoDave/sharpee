// WorldProseChunker.swift
// The IDE half of ADR-321 D11: part-of-speech chunking, re-heading, and
// resolution against the surface the analyzer published.
//
// WHY THIS EXISTS ON THIS SIDE OF THE WIRE. `NLTagger` is macOS-and-Swift; the
// extractor is TypeScript. The analyzer's own reading is article-gated — it only
// sees phrases opened by `the`/`a`/`an` — because ungated extraction without
// part-of-speech information is too noisy to ship. macOS has the lexicon, so the
// IDE can read ungated and recover the phrases the gate hides.
//
// WHAT IT NEVER DOES. It never derives vocabulary, roles, or the shared filters:
// all three are published by the analyzer and applied here. Modelling the
// parser's naming rules twice is the class of error the whole world-index package
// exists to avoid.
//
// AND IT NEVER DROPS. Its output is UNIONED with the analyzer's findings rather
// than replacing them, which is what makes the divergence strictly additive: the
// tagger mis-tags real nouns (`shroud` as an adverb, `well` as an adverb), and a
// reading that trusted it alone would delete findings the author needs to see.
//
// Public interface: WorldProseChunker.candidates(in:filters:),
// WorldProseChunker.read(document:), WorldChunk, WorldReading.
// Owner context: tools/ide — World.

import Foundation
import NaturalLanguage

/// One phrase the tagger pulled out of a passage.
struct WorldChunk: Equatable {
    /// The phrase as it will be shown, lowercased.
    let phrase: String
    /// Its words, in order — the last is the head.
    let words: [String]
}

/// The Incomplete list as the IDE reads it: the analyzer's, plus what the gate hid.
struct WorldReading: Equatable {
    /// Phrases naming a real thing by a word it does not answer to.
    let missingWord: [WorldMissingWordFinding]
    /// Phrases two or more things answer to.
    let ambiguous: [WorldAmbiguousFinding]
    /// Phrases nothing answers to.
    let noObject: [WorldNoObjectFinding]
    /// How many of each class this reading holds.
    var counts: WorldIncompleteCounts {
        WorldIncompleteCounts(missingWord: missingWord.count,
                              ambiguous: ambiguous.count,
                              noObject: noObject.count)
    }
}

enum WorldProseChunker {

    // MARK: - Chunking

    /// Pull candidate noun phrases out of one passage, ungated.
    ///
    /// A candidate is a maximal run of nouns and adjectives, trimmed so it ends at
    /// a noun and capped to the filters' word limit. Verbs end runs rather than
    /// joining them, which is where re-heading comes from for free: the analyzer
    /// reads *the hurricane lamp burns* as a three-word phrase headed by `burns`
    /// and loses the lamp, while a run of nouns and adjectives stops at `lamp`.
    ///
    /// - Parameters:
    ///   - text: the whole passage
    ///   - filters: the head filters the analyzer published
    /// - Returns: each distinct phrase, in order of appearance
    static func candidates(in text: String, filters: WorldExtractorFilters) -> [WorldChunk] {
        let tagger = NLTagger(tagSchemes: [.lexicalClass])
        tagger.string = text

        var runs: [[String]] = []
        var run: [String] = []

        tagger.enumerateTags(in: text.startIndex..<text.endIndex,
                             unit: .word,
                             scheme: .lexicalClass,
                             options: [.omitPunctuation, .omitWhitespace]) { tag, range in
            let word = text[range].lowercased()
            switch tag {
            case .noun, .adjective:
                run.append(word)
            default:
                if !run.isEmpty { runs.append(run); run = [] }
            }
            return true
        }
        if !run.isEmpty { runs.append(run) }

        var found: [WorldChunk] = []
        var seen = Set<String>()

        for run in runs {
            // The run may end on an adjective when a verb followed it; a phrase must
            // end at its head, so trim back to the last noun-shaped word. Adjectives
            // and nouns are not distinguished again here — the tagger already told us
            // which words the run is made of, and the trim only has to find the end.
            guard let capped = capped(run, to: filters.maxPhraseWords) else { continue }
            let head = capped[capped.count - 1]
            guard head.count >= filters.minHeadLength,
                  !filters.headStopwords.contains(head),
                  !looksInflected(head) else { continue }

            let phrase = capped.joined(separator: " ")
            if seen.contains(phrase) { continue }
            seen.insert(phrase)
            found.append(WorldChunk(phrase: phrase, words: capped))
        }
        return found
    }

    /// The last `limit` words of a run, or nil when the run is empty.
    /// - Parameters:
    ///   - run: the run of nouns and adjectives
    ///   - limit: the most words a phrase may carry
    /// - Returns: the trailing words, head last
    private static func capped(_ run: [String], to limit: Int) -> [String]? {
        guard !run.isEmpty else { return nil }
        guard run.count > limit else { return run }
        return Array(run.suffix(limit))
    }

    /// Whether a word ends in a verb or participle suffix.
    /// - Parameter word: the word to test
    /// - Returns: true for `-ed` and `-ing`, which head no noun phrase here
    private static func looksInflected(_ word: String) -> Bool {
        word.hasSuffix("ed") || word.hasSuffix("ing")
    }

    // MARK: - Reading a whole document

    /// Read one story's prose the way only this side can, and union the result
    /// with what the analyzer already reported.
    ///
    /// The analyzer's findings go in FIRST and unchanged, so every one of them
    /// survives with its own site and its own phrase — that is AC-16 held by
    /// construction rather than by argument. The chunked findings are then added
    /// where they say something the analyzer's list does not already hold.
    ///
    /// - Parameter document: the analyzer's document, with all four D11 surfaces
    /// - Returns: the merged candidate list
    static func read(document: WorldIndexDocument) -> WorldReading {
        var missingWord = document.incomplete.missingWord
        var ambiguous = document.incomplete.ambiguous
        var noObject = document.incomplete.noObject

        var seen = Set<String>()
        for finding in missingWord { seen.insert(key(finding.site, finding.phrase)) }
        for finding in ambiguous { seen.insert(key(finding.site, finding.phrase)) }
        for finding in noObject { seen.insert(key(finding.site, finding.phrase)) }
        for edge in document.incomplete.edges { seen.insert(key(edge.site, edge.phrase)) }

        for site in document.prose {
            for chunk in candidates(in: site.text, filters: document.filters) {
                let id = key(site, chunk.phrase)
                if seen.contains(id) { continue }
                seen.insert(id)

                switch classify(chunk, against: document.vocabulary, filters: document.filters) {
                case .resolved:
                    continue
                case .missingWord(let entity, let missing, let knownAs):
                    missingWord.append(WorldMissingWordFinding(
                        site: site, phrase: chunk.phrase, entity: entity,
                        missing: missing, knownAs: knownAs))
                case .ambiguous(let candidates):
                    ambiguous.append(WorldAmbiguousFinding(
                        site: site, phrase: chunk.phrase, candidates: candidates))
                case .noObject:
                    noObject.append(WorldNoObjectFinding(site: site, phrase: chunk.phrase))
                }
            }
        }

        return WorldReading(missingWord: missingWord, ambiguous: ambiguous, noObject: noObject)
    }

    /// A finding's identity for deduplication: where it sits, and what it says.
    /// - Parameters:
    ///   - site: the passage
    ///   - phrase: the phrase
    /// - Returns: a key unique to that pair
    private static func key(_ site: WorldProseSite, _ phrase: String) -> String {
        "\(site.key)\u{1F}\(phrase)"
    }

    // MARK: - Classification

    /// What a chunk turned out to be.
    enum Verdict: Equatable {
        /// It names exactly one thing — not a finding.
        case resolved
        /// It names a real thing by words that thing does not answer to.
        case missingWord(entity: String, missing: [String], knownAs: [String])
        /// It reaches two or more things.
        case ambiguous(candidates: [String])
        /// Nothing answers to it.
        case noObject
    }

    /// Classify one chunk against the published naming surface.
    ///
    /// The tiers mirror the analyzer's `classify` exactly, and must: a phrase read
    /// two ways is two readings of the story rather than one seen at two depths.
    ///
    /// - Parameters:
    ///   - chunk: the phrase and its words
    ///   - vocabulary: the surface the analyzer published
    ///   - filters: the shared filters, for the stopwords a modifier is excused by
    /// - Returns: the verdict
    static func classify(_ chunk: WorldChunk,
                         against vocabulary: WorldVocabulary,
                         filters: WorldExtractorFilters) -> Verdict {
        let candidates = vocabulary.resolve(phrase: chunk.phrase, words: chunk.words)
        if candidates.count == 1 { return .resolved }
        if candidates.count > 1 { return .ambiguous(candidates: candidates) }

        guard let head = chunk.words.last else { return .noObject }
        let headMatches = vocabulary.resolve(phrase: head, words: [head])
        if headMatches.isEmpty { return .noObject }
        if headMatches.count > 1 { return .ambiguous(candidates: headMatches) }

        let only = headMatches[0]
        let known = vocabulary.words(of: only)
        let missing = chunk.words.dropLast().filter {
            !known.contains($0) && !filters.headStopwords.contains($0)
        }
        if missing.isEmpty { return .resolved }
        return .missingWord(entity: only, missing: Array(missing), knownAs: known.sorted())
    }
}
