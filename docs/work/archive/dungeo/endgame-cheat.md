# Mainframe Zork: The INCANT Cheat Mechanism

## Overview

The `INCANT` command was a hidden cheat in the Fortran port of mainframe Zork (Dungeon) that allowed players to skip directly to the endgame. It used a challenge-response authentication system designed by Bob Supnik to prevent casual players from bypassing the game while allowing DEC insiders (who had access to the source code) to test the endgame.

## Usage

```
>INCANT <challenge> <response>
```

When successful, the player is teleported to the **Top of Stairs** in the endgame area with the elvish sword, starting at 15/100 endgame points.

## The ENCRYP Algorithm

The response is computed using the `ENCRYP` subroutine found in `dso7.F`, written by R. M. Supnik:

### Secret Key

```
ECORMS
```

### Algorithm

```fortran
SUBROUTINE ENCRYP(INW,OUTW)
C COPYRIGHT 1980, INFOCOM COMPUTERS AND COMMUNICATIONS
C WRITTEN BY R. M. SUPNIK

DATA KEYW/'E','C','O','R','M','S'/

C 1. Convert input and key to 1-26 range (A=1, B=2, ... Z=26)
C 2. Compute USUM = (sum_of_input MOD 8) + (8 * (sum_of_key MOD 8))
C 3. For each character position i:
C    - XOR input[i] with key[i] with USUM
C    - Mask to 5 bits (AND 31)
C    - If result > 26, take MOD 26
C    - If result = 0, set to 1
C    - Convert back to letter (add 64)
C    - Increment USUM MOD 32
```

### Python Implementation

```python
def encryp(challenge):
    """
    Compute INCANT response for mainframe Zork.
    Port of ENCRYP from dso7.F by R. M. Supnik.
    """
    KEY = "ECORMS"

    # Pad/truncate to 6 characters
    inw = challenge.upper().ljust(6)[:6]

    # Convert to 1-26 range
    ukeyw = [ord(c) - 64 for c in KEY]

    # Handle input with cycling for short strings
    uinw = []
    j = 0
    clean = inw.rstrip() or " "
    for i in range(6):
        c = inw[j] if j < len(inw) else ' '
        if ord(c) <= 64:
            j = 0
            c = clean[0]
        uinw.append(ord(c) - 64)
        j = (j + 1) % len(clean)

    # Compute sums and initial mask
    usum = (sum(uinw) % 8) + (8 * (sum(ukeyw) % 8))

    # Encrypt each character
    result = []
    for i in range(6):
        j = ((uinw[i] ^ ukeyw[i]) ^ usum) & 31
        usum = (usum + 1) % 32
        if j > 26:
            j = j % 26
        j = max(1, j)
        result.append(chr(j + 64))

    return ''.join(result)


# Example usage
print(encryp("MHORAM"))  # Output: DFNOBO
print(encryp("DNZHUO"))  # Output: IDEQTQ
```

## Known Working Pairs

| Challenge | Response | Notes                      |
| --------- | -------- | -------------------------- |
| `MHORAM`  | `DFNOBO` | Documented in walkthroughs |
| `DNZHUO`  | `IDEQTQ` | Documented in walkthroughs |

**Note:** Some historical sources list `DNZHUE` as a challenge, but this appears to be a transcription error. The correct challenge is `DNZHUO`.

## After INCANT

Upon successful incantation, the player appears at the Top of Stairs with:

- The elvish sword (required to solve the first puzzle)
- 15 points out of 100 endgame points
- Main game score is abandoned (endgame has separate 100-point scoring)

### Immediate Next Steps

1. Go to the beam of light
2. `BREAK BEAM WITH SWORD`
3. Press the red button
4. Enter the mirror (rotating room puzzle)
5. Answer the Dungeon Master's trivia questions

## GDT vs INCANT

Bob Supnik implemented multiple cheat mechanisms over time:

| Mechanism  | Purpose                                 | Authentication                |
| ---------- | --------------------------------------- | ----------------------------- |
| **GDT**    | Game Debugging Tool - full debug access | Various challenges by version |
| **INCANT** | Skip to endgame only                    | ENCRYP algorithm              |

### GDT Challenges (varied by version)

- Early PDP-11: `SUPNIK,BARNEY,70524` (name, cat's name, badge number)
- Later versions: `YRUZEV` → `VAX`
- VAX version: Flag-controlled (`GDTFLG`), no challenge needed

## Historical Context

From Bob Supnik's recollections:

> "Once the game was released, players quickly realized that it offered a simple way to short circuit the game and to undo mistakes. Lost something to the thief? Take it back. Getting killed too often? Turn on immortality mode. So I implemented a variety of challenges to prevent players from entering GDT without making the mechanism too difficult for me to remember. I think the INCANT mechanism might have been the final PDP-11 challenge."

The key "ECORMS" appears to be an anagram or scrambling of something meaningful to Supnik, though its origin is undocumented.

## Source Code Reference

The `ENCRYP` function is located in:

- **Fortran**: `dso7.F` (or `dso7.for`)
- **C port**: `dso7.c`

Available in historical source archives:

- [videogamepreservation/zork-fortran](https://github.com/videogamepreservation/zork-fortran)
- [historicalsource/zork-fortran](https://github.com/historicalsource/zork-fortran)
- [devshane/zork](https://github.com/devshane/zork) (C port)

## Version Notes

The INCANT mechanism was present in:

- Fortran versions (PDP-11, VAX)
- C ports derived from Fortran

It was **not** present in:

- Original MDL/Muddle version
- Commercial Infocom Zork I/II/III (Z-machine versions)

---

_Documented from analysis of original Fortran source code, December 2024._
