import { Result } from '../../src/types/result';

describe('Result', () => {
  describe('Creation', () => {
    it('should create success results', () => {
      const result = Result.ok(42);
      expect(result).toEqual({ success: true, value: 42 });
    });

    it('should create failure results', () => {
      const error = new Error('Test error');
      const result = Result.fail(error);
      expect(result).toEqual({ success: false, error });
    });

    it('should handle any value types', () => {
      const objectResult = Result.ok({ name: 'test', count: 5 });
      expect(objectResult.success).toBe(true);
      if (objectResult.success) {
        expect(objectResult.value).toEqual({ name: 'test', count: 5 });
      }

      const nullResult = Result.ok(null);
      expect(nullResult).toEqual({ success: true, value: null });

      const stringError = Result.fail('Error message');
      expect(stringError).toEqual({ success: false, error: 'Error message' });
    });
  });

  describe('Type Guards', () => {
    it('should identify success results', () => {
      const result = Result.ok('success');
      expect(Result.isOk(result)).toBe(true);
      expect(Result.isFail(result)).toBe(false);
    });

    it('should identify failure results', () => {
      const result = Result.fail('error');
      expect(Result.isOk(result)).toBe(false);
      expect(Result.isFail(result)).toBe(true);
    });

    it('should narrow types correctly', () => {
      const result: Result<number, string> = Math.random() > 0.5 
        ? Result.ok(42) 
        : Result.fail('error');

      if (Result.isOk(result)) {
        // TypeScript should know result.value is number
        const value: number = result.value;
        expect(typeof value).toBe('number');
      } else {
        // TypeScript should know result.error is string
        const error: string = result.error;
        expect(typeof error).toBe('string');
      }
    });
  });

  describe('Transformations', () => {
    describe('map', () => {
      it('should transform success values', () => {
        const result = Result.ok(5);
        const mapped = Result.map(result, x => x * 2);
        expect(mapped).toEqual({ success: true, value: 10 });
      });

      it('should pass through failures', () => {
        const result = Result.fail('error');
        const mapped = Result.map(result, (x: number) => x * 2);
        expect(mapped).toEqual({ success: false, error: 'error' });
      });

      it('should handle type transformations', () => {
        const result = Result.ok(5);
        const mapped = Result.map(result, x => `Number: ${x}`);
        expect(mapped).toEqual({ success: true, value: 'Number: 5' });
      });
    });

    describe('mapError', () => {
      it('should transform error values', () => {
        const result = Result.fail('error');
        const mapped = Result.mapError(result, err => new Error(err));
        expect(Result.isFail(mapped)).toBe(true);
        if (!mapped.success) {
          expect(mapped.error).toBeInstanceOf(Error);
          expect(mapped.error.message).toBe('error');
        }
      });

      it('should pass through successes', () => {
        const result = Result.ok(42);
        const mapped = Result.mapError(result, err => new Error(String(err)));
        expect(mapped).toEqual({ success: true, value: 42 });
      });
    });

    describe('flatMap', () => {
      it('should chain successful results', () => {
        const result = Result.ok(5);
        const chained = Result.flatMap(result, x => 
          x > 0 ? Result.ok(x * 2) : Result.fail('negative')
        );
        expect(chained).toEqual({ success: true, value: 10 });
      });

      it('should propagate failures', () => {
        const result = Result.fail('initial error');
        const chained = Result.flatMap(result, (x: number) => Result.ok(x * 2));
        expect(chained).toEqual({ success: false, error: 'initial error' });
      });

      it('should handle chained failures', () => {
        const result = Result.ok(-5);
        const chained = Result.flatMap(result, x => 
          x > 0 ? Result.ok(x * 2) : Result.fail('negative number')
        );
        expect(chained).toEqual({ success: false, error: 'negative number' });
      });

      it('should allow complex chains', () => {
        const parseNumber = (s: string): Result<number, string> =>
          isNaN(Number(s)) ? Result.fail('not a number') : Result.ok(Number(s));

        const divideBy = (divisor: number) => (x: number): Result<number, string> =>
          divisor === 0 ? Result.fail('division by zero') : Result.ok(x / divisor);

        const result = Result.flatMap(
          Result.flatMap(parseNumber('10'), divideBy(2)),
          x => Result.ok(x + 1)
        );

        expect(result).toEqual({ success: true, value: 6 });
      });
    });
  });

  describe('Unwrapping', () => {
    describe('unwrap', () => {
      it('should return value for success', () => {
        const result = Result.ok(42);
        expect(Result.unwrap(result)).toBe(42);
      });

      it('should throw error for failure', () => {
        const error = new Error('Test error');
        const result = Result.fail(error);
        expect(() => Result.unwrap(result)).toThrow(error);
      });

      it('should throw non-Error failures', () => {
        const result = Result.fail('string error');
        expect(() => Result.unwrap(result)).toThrow('string error');
      });
    });

    describe('unwrapOr', () => {
      it('should return value for success', () => {
        const result = Result.ok(42);
        expect(Result.unwrapOr(result, 0)).toBe(42);
      });

      it('should return default for failure', () => {
        const result = Result.fail('error');
        expect(Result.unwrapOr(result, 99)).toBe(99);
      });

      it('should handle different types', () => {
        const result: Result<string, Error> = Result.fail(new Error());
        expect(Result.unwrapOr(result, 'default')).toBe('default');
      });
    });
  });

  describe('Real-world usage patterns', () => {
    it('should work for parsing operations', () => {
      const parseJson = <T>(text: string): Result<T, Error> => {
        try {
          return Result.ok(JSON.parse(text));
        } catch (error) {
          return Result.fail(error as Error);
        }
      };

      const goodJson = '{"name": "test"}';
      const goodResult = parseJson<{name: string}>(goodJson);
      expect(Result.isOk(goodResult)).toBe(true);
      if (goodResult.success) {
        expect(goodResult.value.name).toBe('test');
      }

      const badJson = '{invalid}';
      const badResult = parseJson(badJson);
      expect(Result.isFail(badResult)).toBe(true);
    });

    it('should work for validation chains', () => {
      const validatePositive = (n: number): Result<number, string> =>
        n > 0 ? Result.ok(n) : Result.fail('must be positive');

      const validateEven = (n: number): Result<number, string> =>
        n % 2 === 0 ? Result.ok(n) : Result.fail('must be even');

      const validateNumber = (n: number): Result<number, string> =>
        Result.flatMap(validatePositive(n), validateEven);

      expect(validateNumber(4)).toEqual({ success: true, value: 4 });
      expect(validateNumber(-4)).toEqual({ success: false, error: 'must be positive' });
      expect(validateNumber(3)).toEqual({ success: false, error: 'must be even' });
    });
  });
});
