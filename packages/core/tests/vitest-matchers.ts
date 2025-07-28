// Custom Vitest matchers
import { expect } from 'vitest'

interface CustomMatchers<R = unknown> {
  toStartWith(expected: string): R
  toEndWith(expected: string): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  toStartWith(received: string, expected: string) {
    const pass = received.startsWith(expected)
    return {
      pass,
      message: () => 
        pass
          ? `expected ${received} not to start with ${expected}`
          : `expected ${received} to start with ${expected}`
    }
  },
  
  toEndWith(received: string, expected: string) {
    const pass = received.endsWith(expected)
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to end with ${expected}`
          : `expected ${received} to end with ${expected}`
    }
  }
})

export {}
