/**
 * Language content for help action
 */

export const helpLanguage = {
  actionId: 'if.action.help',
  
  patterns: [
    'help',
    'help [topic]',
    '?',
    'commands',
    'h'
  ],
  
  messages: {
    // General help
    'general_help': "Welcome to Interactive Fiction!\n\nBasic commands:\n- LOOK (L): Examine your surroundings\n- INVENTORY (I): List what you're carrying\n- EXAMINE (X) [object]: Look at something closely\n- TAKE/DROP [object]: Pick up or put down items\n- GO [direction] or just [direction]: Move around\n\nFor more help on a specific topic, type HELP [topic].",
    
    // Topic help headers
    'help_topic': "Help on {topic}:",
    'unknown_topic': "No help available on '{topic}'. Type HELP for general help.",
    
    // Movement help
    'help_movement': "Movement commands:\n- GO NORTH/SOUTH/EAST/WEST (or just N/S/E/W)\n- UP/DOWN (U/D)\n- IN/OUT\n- ENTER [place]\n- EXIT",
    
    // Object help
    'help_objects': "Object commands:\n- TAKE/GET [object]\n- DROP [object]\n- EXAMINE/LOOK AT [object]\n- OPEN/CLOSE [object]\n- PUT [object] IN/ON [container]\n- WEAR/REMOVE [clothing]",
    
    // Special commands help
    'help_special': "Special commands:\n- SAVE/RESTORE: Save and load your game\n- SCORE: Check your progress\n- WAIT (Z): Let time pass\n- AGAIN (G): Repeat last command\n- QUIT: Exit the game",
    
    // First time help
    'first_time_help': "New to Interactive Fiction? Try these commands to get started:\n- LOOK to see where you are\n- INVENTORY to see what you're carrying\n- EXAMINE interesting objects\n- Go in compass directions (NORTH, SOUTH, etc.)",
    
    // Hints availability
    'hints_available': "Hints are available. Type HINTS to see them.",
    'hints_disabled': "Hints are not available in this game.",
    
    // Context-sensitive help
    'stuck_help': "If you're stuck, try:\n- LOOK around carefully\n- EXAMINE everything\n- Check your INVENTORY\n- Try different verbs with objects",
    
    // Help footer
    'help_footer': "For a complete list of commands, consult the game documentation."
  },
  
  help: {
    description: 'Get help on game commands and topics.',
    examples: 'help, ?, help movement, help take, commands',
    summary: 'HELP - Get help on game commands and topics. Example: HELP MOVEMENT'
  }
};
