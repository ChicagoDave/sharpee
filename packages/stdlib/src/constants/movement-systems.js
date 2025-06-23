/**
 * Movement Systems for Interactive Fiction
 *
 * Different navigation paradigms for moving between locations
 */
export const MOVEMENT_SYSTEMS = {
    COMPASS: {
        name: 'compass',
        directions: {
            'north': 'north', 'n': 'north',
            'south': 'south', 's': 'south',
            'east': 'east', 'e': 'east',
            'west': 'west', 'w': 'west',
            'northeast': 'northeast', 'ne': 'northeast',
            'northwest': 'northwest', 'nw': 'northwest',
            'southeast': 'southeast', 'se': 'southeast',
            'southwest': 'southwest', 'sw': 'southwest',
            'up': 'up', 'u': 'up',
            'down': 'down', 'd': 'down',
            'in': 'in',
            'out': 'out'
        }
    },
    NAUTICAL: {
        name: 'nautical',
        directions: {
            'fore': 'fore', 'f': 'fore', 'forward': 'fore',
            'aft': 'aft', 'a': 'aft', 'backward': 'aft',
            'port': 'port', 'p': 'port', 'left': 'port',
            'starboard': 'starboard', 'sb': 'starboard', 'right': 'starboard',
            'up': 'up', 'u': 'up', 'above': 'up',
            'down': 'down', 'd': 'down', 'below': 'below'
        }
    },
    CLOCK: {
        name: 'clock',
        directions: {
            '12': '12', 'twelve': '12',
            '1': '1', 'one': '1',
            '2': '2', 'two': '2',
            '3': '3', 'three': '3',
            '4': '4', 'four': '4',
            '5': '5', 'five': '5',
            '6': '6', 'six': '6',
            '7': '7', 'seven': '7',
            '8': '8', 'eight': '8',
            '9': '9', 'nine': '9',
            '10': '10', 'ten': '10',
            '11': '11', 'eleven': '11',
            'up': 'up',
            'down': 'down'
        }
    }
};
//# sourceMappingURL=movement-systems.js.map