-- Batch 2: lang-en-us and parser-en-us test classifications
-- Generated 2026-04-06

-- =============================================================================
-- lang-en-us/tests/coverage-improvements.test.ts
-- =============================================================================

-- Pluralization - Case Preservation (IDs 2865-2868)
-- These test actual function output transformations with specific input/output assertions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2865;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2866;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2867;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2868;

-- Event Message Functions > formatInventory (IDs 2869-2873)
-- Tests formatInventory with specific inputs and exact string output assertions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2869;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2870;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2871;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2872;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2873;

-- Event Message Functions > formatRoomDescription (IDs 2874-2877)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2874;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2875;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2876;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2877;

-- Event Message Functions > formatContainerContents (IDs 2878-2881)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2878;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2879;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2880;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2881;

-- =============================================================================
-- lang-en-us/tests/formatters.test.ts
-- =============================================================================

-- parsePlaceholder (IDs 2882-2885)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2882;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2883;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2884;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2885;

-- Article Formatters > aFormatter (IDs 2886-2892)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2886;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2887;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2888;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2889;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2890;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2891;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2892;

-- Article Formatters > theFormatter (IDs 2893-2894)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2893;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2894;

-- Article Formatters > someFormatter (ID 2895)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2895;

-- List Formatters > listFormatter (IDs 2896-2900)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2896;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2897;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2898;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2899;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2900;

-- List Formatters > orListFormatter (IDs 2901-2902)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2901;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2902;

-- Text Formatters > capFormatter, upperFormatter (IDs 2903-2904)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2903;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2904;

-- formatMessage (IDs 2905-2912)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2905;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2906;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2907;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2908;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2909;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2910;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2911;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2912;

-- applyFormatters (IDs 2913-2914)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2913;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2914;

-- =============================================================================
-- lang-en-us/tests/integration.test.ts
-- =============================================================================

-- Text Processing Pipeline (IDs 2915-2917)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2915;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2916;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2917;

-- Vocabulary Lookup (IDs 2918-2920)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2918;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2919;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2920;

-- Grammar Pattern Matching (ID 2921)
-- Only checks patterns exist by name, doesn't actually test matching
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2921;

-- Message Formatting (ID 2922)
-- Uses manual string.replace instead of the actual formatter system - tests string replacement, not the system
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Replace manual string.replace with actual formatMessage call to test the real system' WHERE id=2922;

-- Error Handling (IDs 2923-2925)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2923;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2924;
-- "should handle very long inputs" just checks no throw - adequate
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2925;

-- Real-world Usage Scenarios (IDs 2926-2927)
-- "should process common IF commands" - only checks toBeDefined which is weak
UPDATE tests SET test_type='behavioral', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Assert specific lemmatized values rather than just toBeDefined' WHERE id=2926;
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2927;

-- Performance Considerations (IDs 2928-2929)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2928;
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2929;

-- Compatibility (IDs 2930-2931)
-- These check typeof and Array.isArray - structural interface conformance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2930;
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2931;

-- =============================================================================
-- lang-en-us/tests/language-provider.test.ts
-- =============================================================================

-- Language Metadata (IDs 2932-2934)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2932;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2933;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2934;

-- getVerbs() (IDs 2935-2939)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2935;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2936;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2937;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2938;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2939;

-- getDirections() (IDs 2940-2945)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2940;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2941;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2942;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2943;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2944;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2945;

-- getSpecialVocabulary() (IDs 2946-2950)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2946;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2947;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2948;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2949;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2950;

-- getCommonAdjectives() (IDs 2951-2954)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2951;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2952;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2953;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2954;

-- getCommonNouns() (IDs 2955-2956)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2955;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2956;

-- getPrepositions() (IDs 2957-2958)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2957;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2958;

-- getGrammarPatterns() (IDs 2959-2963)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2959;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2960;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2961;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2962;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2963;

-- =============================================================================
-- lang-en-us/tests/text-processing.test.ts
-- =============================================================================

-- lemmatize() - regular plurals (IDs 2964-2966)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2964;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2965;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2966;

-- lemmatize() - -es endings (IDs 2967-2968)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2967;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2968;

-- lemmatize() - -ies endings (IDs 2969-2970)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2969;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2970;

-- lemmatize() - -ed endings (IDs 2971-2972)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2971;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2972;

-- lemmatize() - -ing endings (IDs 2973-2974)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2973;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2974;

-- lemmatize() - irregular plurals (ID 2975)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2975;

-- lemmatize() - case handling (IDs 2976-2977)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2976;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2977;

-- lemmatize() - unchanged words (ID 2978)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2978;

-- pluralize() - regular plurals (ID 2979)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2979;

-- pluralize() - sibilant endings (IDs 2980-2981)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2980;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2981;

-- pluralize() - consonant + y (IDs 2982-2983)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2982;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2983;

-- pluralize() - f and fe endings (IDs 2984-2985)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2984;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2985;

-- pluralize() - irregular plurals (ID 2986)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2986;

-- pluralize() - case preservation (ID 2987)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2987;

-- getIndefiniteArticle() (IDs 2988-2993)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2988;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2989;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2990;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2991;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2992;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2993;

-- expandAbbreviation() (IDs 2994-2999)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2994;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2995;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2996;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2997;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2998;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2999;

-- formatList() (IDs 3000-3008)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3000;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3001;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3002;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3003;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3004;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3005;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3006;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3007;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3008;

-- isIgnoreWord() (IDs 3009-3012)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3009;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3010;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3011;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3012;

-- =============================================================================
-- lang-en-us/tests/unit/grammar.test.ts
-- =============================================================================

-- EnglishPartsOfSpeech (IDs 3013-3016)
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3013;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3014;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3015;
-- "type should correctly represent all values" - assigns a literal and checks it's in the set. Tautological-leaning but validates type/value alignment
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3016;

-- EnglishGrammarPatterns (IDs 3017-3021)
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3017;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3018;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3019;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3020;
-- "type should represent all pattern names" - same tautological pattern
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3021;

-- EnglishGrammarUtils > isArticle (IDs 3022-3024)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3022;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3023;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3024;

-- EnglishGrammarUtils > isDeterminer (IDs 3025-3030)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3025;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3026;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3027;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3028;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3029;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3030;

-- EnglishGrammarUtils > isPronoun (IDs 3031-3036)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3031;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3032;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3033;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3034;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3035;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3036;

-- EnglishGrammarUtils > isConjunction (IDs 3037-3040)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3037;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3038;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3039;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3040;

-- EnglishGrammarUtils > getIndefiniteArticle (IDs 3041-3045)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3041;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3042;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3043;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3044;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3045;

-- Grammar pattern validation (IDs 3046-3047)
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3046;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3047;

-- Edge cases and error conditions (IDs 3048-3050)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3048;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3049;
-- "types should support partial data" - assigns minimal data and asserts back what was assigned
UPDATE tests SET test_type='tautological', quality='dead', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Remove - tautological, asserts values that were just assigned to local variables' WHERE id=3050;

-- =============================================================================
-- lang-en-us/tests/unit/perspective/placeholder-resolver.test.ts
-- =============================================================================

-- resolvePerspectivePlaceholders > 2nd person (IDs 3051-3055)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3051;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3052;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3053;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3054;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3055;

-- resolvePerspectivePlaceholders > 1st person (IDs 3056-3060)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3056;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3057;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3058;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3059;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3060;

-- resolvePerspectivePlaceholders > 3rd person singular (IDs 3061-3065)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3061;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3062;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3063;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3064;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3065;

-- resolvePerspectivePlaceholders > 3rd person plural (IDs 3066-3069)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3066;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3067;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3068;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3069;

-- parameter placeholders pass through (IDs 3070-3071)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3070;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3071;

-- conjugateVerb > regular verbs (IDs 3072-3074)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3072;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3073;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3074;

-- conjugateVerb > irregular verbs (IDs 3075-3078)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3075;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3076;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3077;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3078;

-- conjugateVerb > plural they/them (ID 3079)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3079;

-- =============================================================================
-- parser-en-us/tests/action-grammar-builder.test.ts
-- =============================================================================

-- Verb Alias Expansion (IDs 2571-2573)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2571;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2572;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2573;

-- Constraints Application (IDs 2574-2576)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2574;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2575;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2576;

-- Direction Patterns (IDs 2577-2579)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2577;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2578;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2579;

-- Combined Usage (ID 2580)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2580;

-- Pattern Matching Integration (IDs 2581-2582)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2581;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2582;

-- =============================================================================
-- parser-en-us/tests/adr-080-grammar-enhancements.test.ts
-- =============================================================================

-- Pattern Compiler - Greedy Slots (IDs 2583-2587)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2583;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2584;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2585;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2586;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2587;

-- Grammar Builder - .text() method (IDs 2588-2589)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2588;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2589;

-- Grammar Builder - .instrument() method (IDs 2590-2591)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2590;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2591;

-- Grammar Engine - Text Slot Matching (ID 2592)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2592;

-- Grammar Engine - Greedy Text Slot Matching (IDs 2593-2594)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2593;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2594;

-- Grammar Engine - Instrument Slot Matching (ID 2595)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2595;

-- Grammar Engine - "all" Keyword Recognition (IDs 2596-2598)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2596;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2597;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2598;

-- Grammar Engine - "and" List Parsing (IDs 2599-2602)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2599;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2600;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2601;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2602;

-- Phase 3: Command Chaining (IDs 2603-2610)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2603;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2604;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2605;
-- "should preserve quoted strings" - only checks result length, no real assertion about quote preservation
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2606;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2607;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2608;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2609;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2610;

-- ADR-082: Vocabulary Slots (IDs 2611-2613)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2611;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2612;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2613;

-- ADR-082: Manner Slots (IDs 2614-2618)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2614;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2615;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2616;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2617;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2618;

-- =============================================================================
-- parser-en-us/tests/adr-082-typed-slots.test.ts
-- =============================================================================

-- NUMBER slot (IDs 2619-2623)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2619;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2620;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2621;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2622;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2623;

-- ORDINAL slot (IDs 2624-2626)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2624;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2625;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2626;

-- TIME slot (IDs 2627-2629)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2627;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2628;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2629;

-- DIRECTION slot (IDs 2630-2633)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2630;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2631;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2632;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2633;

-- QUOTED_TEXT slot (ID 2634)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2634;

-- TOPIC slot (IDs 2635-2636)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2635;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2636;

-- Combined typed slots (IDs 2637-2638)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2637;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2638;

-- =============================================================================
-- parser-en-us/tests/colored-buttons.test.ts
-- =============================================================================

-- Single-word references (IDs 2639-2640)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2639;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2640;

-- Multi-word references (IDs 2641-2643)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2641;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2642;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2643;

-- Ambiguous references (IDs 2644-2645)
-- These tests have no meaningful assertion - they just log behavior and don't assert expected outcomes
UPDATE tests SET test_type='behavioral', quality='poor', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Add concrete assertions for disambiguation behavior instead of just logging' WHERE id=2644;
UPDATE tests SET test_type='behavioral', quality='poor', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Add concrete assertions for disambiguation behavior instead of just logging' WHERE id=2645;

-- Entity scope and visibility (ID 2646)
-- Only checks count, doesn't verify specific entities
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2646;

-- Debug: Examine slot matching behavior (IDs 2647-2648)
-- These are debug/exploration tests, not real tests - they just parse and log
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Convert debug logging to proper assertions or remove as they are exploratory/debug tests' WHERE id=2647;
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Convert debug logging to proper assertions or remove as they are exploratory/debug tests' WHERE id=2648;

-- =============================================================================
-- parser-en-us/tests/direction-vocabulary.test.ts
-- =============================================================================

-- default compass vocabulary (IDs 2649-2652)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2649;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2650;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2651;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2652;

-- naval vocabulary (IDs 2653-2659)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2653;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2654;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2655;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2656;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2657;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2658;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2659;

-- minimal vocabulary (IDs 2660-2664)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2660;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2661;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2662;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2663;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2664;

-- switching vocabularies (IDs 2665-2666)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2665;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2666;

-- getGrammarDirectionMap (IDs 2667-2670)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2667;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2668;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2669;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2670;

-- case handling (IDs 2671-2674)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2671;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2672;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2673;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2674;

-- fallback for unknown directions (ID 2675)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2675;

-- =============================================================================
-- parser-en-us/tests/english-grammar-engine.test.ts
-- =============================================================================

-- Basic Pattern Matching (IDs 2676-2679)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2676;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2677;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2678;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2679;

-- Slot Extraction (IDs 2680-2682)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2680;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2681;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2682;

-- Priority and Confidence (IDs 2683-2684)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2683;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2684;

-- Edge Cases (IDs 2685-2687)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2685;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2686;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2687;

-- Multiple Rule Matching (IDs 2688-2689)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2688;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2689;

-- =============================================================================
-- parser-en-us/tests/english-pattern-compiler.test.ts
-- =============================================================================

-- Pattern Compilation (IDs 2690-2694)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2690;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2691;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2692;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2693;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2694;

-- Pattern Validation (IDs 2695-2699)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2695;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2696;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2697;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2698;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2699;

-- Slot Extraction (IDs 2700-2702)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2700;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2701;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2702;

-- Error Handling (IDs 2703-2704)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2703;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2704;

-- Edge Cases (IDs 2705-2707)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2705;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2706;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2707;

-- =============================================================================
-- parser-en-us/tests/grammar-lang-sync.test.ts
-- =============================================================================

-- Verb Coverage (IDs 2708-2709)
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2708;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2709;

-- Sync Detection (IDs 2710-2712)
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2710;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2711;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2712;

-- =============================================================================
-- parser-en-us/tests/grammar-scope-cross-location.test.ts
-- =============================================================================

-- grammar parses regardless of location (IDs 2713-2714)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2713;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2714;

-- nearby() scope across adjacent locations (ID 2715)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2715;

-- carried() scope across locations (ID 2716)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2716;

-- =============================================================================
-- parser-en-us/tests/grammar-scope.test.ts
-- =============================================================================

-- grammar parses regardless of scope (IDs 2717-2719)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2717;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2718;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2719;

-- grammar parses regardless of carried status (IDs 2720-2721)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2720;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2721;

-- grammar parses regardless of portable status (ID 2722)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2722;

-- complex patterns with multiple constraints (ID 2723)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2723;

-- =============================================================================
-- parser-en-us/tests/improved-error-messages.test.ts
-- =============================================================================

-- analyzeBestFailure (IDs 2724-2732)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2724;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2725;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2726;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2727;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2728;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2729;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2730;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2731;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2732;

-- =============================================================================
-- parser-en-us/tests/parser-integration.test.ts
-- =============================================================================

-- Core Grammar Patterns (IDs 2733-2736)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2733;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2734;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2735;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2736;

-- Direction Commands (IDs 2737-2739)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2737;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2738;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2739;

-- Compound Verbs (IDs 2740-2741)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2740;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2741;

-- Preposition Handling (IDs 2742-2743)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2742;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2743;

-- Vocabulary Recognition (ID 2744)
-- Tests preposition recognition in tokenization - adequate, but tests internal tokenizer state
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2744;

-- Error Handling (IDs 2745-2747)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2745;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2746;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2747;

-- Custom Grammar Registration (ID 2748)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2748;

-- VERB_NOUN_NOUN Patterns (IDs 2749-2752)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2749;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2750;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2751;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2752;

-- Complex Noun Phrases (IDs 2753-2755)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2753;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2754;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2755;

-- Optional Elements in Patterns (IDs 2756-2761)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2756;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2757;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2758;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2759;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2760;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2761;

-- Quoted String Patterns (IDs 2762-2769)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2762;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2763;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2764;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2765;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2766;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2767;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2768;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2769;

-- Multiple Preposition Patterns (IDs 2770-2775) - ALL FAILING
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly' WHERE id=2770;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly' WHERE id=2771;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly' WHERE id=2772;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly' WHERE id=2773;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly' WHERE id=2774;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly' WHERE id=2775;

-- =============================================================================
-- parser-en-us/tests/pronoun-context.test.ts
-- =============================================================================

-- isRecognizedPronoun (IDs 2776-2779)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2776;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2777;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2778;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2779;

-- INANIMATE pronoun sets (IDs 2780-2781)
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2780;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2781;

-- PronounContextManager > resolve (IDs 2782-2788)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2782;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2783;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2784;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2785;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2786;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2787;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2788;

-- PronounContextManager > reset (ID 2789)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2789;

-- PronounContextManager > registerEntity (IDs 2790-2793)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2790;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2791;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2792;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2793;

-- PronounContextManager > lastCommand (ID 2794)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2794;

-- =============================================================================
-- parser-en-us/tests/push-panel-pattern.test.ts
-- =============================================================================

-- literal pattern priority (IDs 2795-2798)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2795;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2796;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2797;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2798;

-- slot pattern vs literal pattern (ID 2799)
-- Only logs which action matched, doesn't assert a specific expected outcome
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2799;

-- =============================================================================
-- parser-en-us/tests/slot-consumers/slot-consumer-registry.test.ts
-- =============================================================================

-- Basic Registry Operations (IDs 2812-2815)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2812;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2813;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2814;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2815;

-- Default Registry (IDs 2816-2817)
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2816;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2817;

-- =============================================================================
-- parser-en-us/tests/slot-consumers/text-slot-consumer.test.ts
-- =============================================================================

-- TEXT slot (IDs 2818-2820)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2818;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2819;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2820;

-- TEXT_GREEDY slot (IDs 2821-2822)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2821;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2822;

-- QUOTED_TEXT slot (IDs 2823-2826)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2823;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2824;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2825;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2826;

-- TOPIC slot (IDs 2827-2828)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2827;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2828;

-- =============================================================================
-- parser-en-us/tests/slot-consumers/typed-slot-consumer.test.ts
-- =============================================================================

-- NUMBER slot (IDs 2829-2831)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2829;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2830;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2831;

-- ORDINAL slot (IDs 2832-2834)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2832;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2833;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2834;

-- TIME slot (IDs 2835-2836)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2835;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2836;

-- DIRECTION slot (IDs 2837-2840)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2837;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2838;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2839;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2840;

-- =============================================================================
-- parser-en-us/tests/story-grammar.test.ts
-- =============================================================================

-- basic pattern registration (IDs 2800-2801)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2800;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2801;

-- ADR-084: full PatternBuilder access (IDs 2802-2803)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2802;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2803;

-- complex story patterns (ID 2804)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2804;

-- =============================================================================
-- parser-en-us/tests/unit/english-parser.test.ts
-- =============================================================================

-- parse - basic commands (IDs 2841-2844)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2841;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2842;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2843;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2844;

-- parse - with articles (IDs 2845-2846)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2845;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2846;

-- parse - abbreviations (IDs 2847-2848)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2847;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2848;

-- parse - error handling (IDs 2849-2851)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2849;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2850;
-- skipped test
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test is skipped - investigate why take in box is parsing successfully and fix or update test' WHERE id=2851;

-- tokenize (IDs 2852-2854)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2852;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2853;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2854;

-- debug events (IDs 2855-2858)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2855;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2856;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2857;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2858;

-- parseWithErrors (IDs 2859-2861)
-- skipped test
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test is skipped - parseWithErrors needs updating for new grammar engine' WHERE id=2859;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2860;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2861;

-- complex scenarios (IDs 2862-2864)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2862;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2863;
-- skipped test
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test is skipped - put down without object pattern matching needs investigation' WHERE id=2864;

-- =============================================================================
-- parser-en-us/tests/walk-through-pattern.test.ts
-- =============================================================================

-- Literal pattern vs slot pattern (IDs 2805-2807)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2805;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2806;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2807;

-- Slot pattern with constraints (IDs 2808-2810)
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2808;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2809;
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2810;

-- Pattern priority ordering (ID 2811)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2811;
