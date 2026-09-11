import assert from 'node:assert';

export class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new AssertionError(
      `${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      actual,
      expected
    );
  }
}

export function assertDeepEqual(actual, expected, message) {
  try {
    assert.deepStrictEqual(actual, expected);
  } catch (err) {
    throw new AssertionError(
      `${message || 'Deep equality failed'}: ${err.message}`,
      actual,
      expected
    );
  }
}

export function assertTrue(value, message) {
  if (value !== true) {
    throw new AssertionError(`${message || 'Expected true'}, got ${JSON.stringify(value)}`, value, true);
  }
}

export function assertFalse(value, message) {
  if (value !== false) {
    throw new AssertionError(`${message || 'Expected false'}, got ${JSON.stringify(value)}`, value, false);
  }
}

export function assertStatus(response, expectedStatus, message) {
  if (!response || response.status !== expectedStatus) {
    const errorMsg = response?.json?.error || response?.text || 'No response body';
    throw new AssertionError(
      `${message || 'HTTP Status mismatch'}: expected HTTP ${expectedStatus}, received HTTP ${response?.status} with body: ${errorMsg}`,
      response?.status,
      expectedStatus
    );
  }
}

export function assertIncludes(haystack, needle, message) {
  if (typeof haystack === 'string') {
    if (!haystack.includes(needle)) {
      throw new AssertionError(
        `${message || 'String inclusion failed'}: expected "${haystack}" to include "${needle}"`,
        haystack,
        needle
      );
    }
  } else if (Array.isArray(haystack)) {
    const found = haystack.some(item => {
      if (typeof needle === 'object' && needle !== null) {
        return JSON.stringify(item) === JSON.stringify(needle);
      }
      return item === needle;
    });
    if (!found) {
      throw new AssertionError(
        `${message || 'Array inclusion failed'}: item not found in array`,
        haystack,
        needle
      );
    }
  } else {
    throw new AssertionError(`assertIncludes requires string or array, got ${typeof haystack}`);
  }
}

export function assertMatches(str, regex, message) {
  if (typeof str !== 'string' || !regex.test(str)) {
    throw new AssertionError(
      `${message || 'Regex match failed'}: expected "${str}" to match ${regex}`,
      str,
      regex.toString()
    );
  }
}

export function assertGreaterThanOrEqual(val, min, message) {
  if (typeof val !== 'number' || val < min) {
    throw new AssertionError(
      `${message || 'Value below minimum'}: expected ${val} >= ${min}`,
      val,
      min
    );
  }
}

export function assertTruthy(val, message) {
  if (!val) {
    throw new AssertionError(`${message || 'Expected truthy value'}, got ${JSON.stringify(val)}`, val, true);
  }
}

export function assertDefined(val, message) {
  if (val === undefined || val === null) {
    throw new AssertionError(`${message || 'Expected defined value'}, got ${JSON.stringify(val)}`, val, 'defined');
  }
}
