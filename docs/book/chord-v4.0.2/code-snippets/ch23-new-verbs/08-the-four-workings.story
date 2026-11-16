define action kindling
  grammar
    kindle the target
    kindle
  refuse without target: working-wants-a-thing
  the target must be reachable
  the kindle page must be learned: no-such-word
  otherwise refuse nothing-to-kindle

define action hushing
  grammar
    hush the target
    hush
  refuse without target: working-wants-a-thing
  the target must be visible
  the hush page must be learned: no-such-word
  otherwise refuse nothing-to-hush

define action unbinding
  grammar
    unbind the target
    unbind
  refuse without target: working-wants-a-thing
  the target must be reachable
  the unbind page must be learned: no-such-word
  otherwise refuse nothing-to-unbind
