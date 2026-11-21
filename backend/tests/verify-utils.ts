import { calculatePercentage } from '../src/utils/percentage';
import { generateJoinCode, isValidJoinCode, JOIN_CODE_CHARSET } from '../src/utils/joinCode';
import { generateSessionCode, isValidSessionCode } from '../src/utils/sessionCode';
import * as constants from '../src/config/constants';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Running unit checks for utilities (Part 2.3)...\n');

// 1. Percentage edge cases
console.log('1. Testing calculatePercentage edge cases:');
assert(calculatePercentage(0, 0) === null, '0/0 must return null');
console.log('   ✓ 0 / 0 => null');

assert(calculatePercentage(0, -5) === null, 'Negative sessions must return null');
console.log('   ✓ 0 / -5 => null');

assert(calculatePercentage(0, 10) === 0, '0/10 must return 0');
console.log('   ✓ 0 / 10 => 0');

assert(calculatePercentage(1, 3) === 33.3, '1/3 must return 33.3');
console.log('   ✓ 1 / 3 => 33.3%');

assert(calculatePercentage(2, 3) === 66.7, '2/3 must return 66.7');
console.log('   ✓ 2 / 3 => 66.7%');

assert(calculatePercentage(9, 14) === 64.3, '9/14 must return 64.3');
console.log('   ✓ 9 / 14 => 64.3%');

assert(calculatePercentage(12, 14) === 85.7, '12/14 must return 85.7');
console.log('   ✓ 12 / 14 => 85.7%');

assert(calculatePercentage(14, 14) === 100, '14/14 must return 100');
console.log('   ✓ 14 / 14 => 100%');

// 2. Join code generator & validation
console.log('\n2. Testing generateJoinCode (1,000 iterations):');
const joinRegex = new RegExp(`^[${JOIN_CODE_CHARSET}]{6}$`);
for (let i = 0; i < 1000; i++) {
  const code = generateJoinCode();
  assert(code.length === 6, 'Length must be 6');
  assert(joinRegex.test(code), `Invalid characters in: ${code}`);
  assert(!/[0O1I]/.test(code), `Ambiguous character found in: ${code}`);
  assert(isValidJoinCode(code), `isValidJoinCode failed for: ${code}`);
}
assert(!isValidJoinCode('12345'), 'Too short must fail');
assert(!isValidJoinCode('1234567'), 'Too long must fail');
assert(!isValidJoinCode('K7MX0P'), 'Code with 0 must fail');
assert(!isValidJoinCode('K7MX1P'), 'Code with 1 must fail');
console.log('   ✓ 1,000 join codes generated and validated without 0, O, 1, I.');

// 3. Session code generator & validation
console.log('\n3. Testing generateSessionCode (1,000 iterations):');
let sawZeroPrefix = false;
for (let i = 0; i < 1000; i++) {
  const code = generateSessionCode();
  assert(code.length === 6, 'Length must be 6');
  assert(/^[0-9]{6}$/.test(code), `Non-digit character in: ${code}`);
  assert(isValidSessionCode(code), `isValidSessionCode failed for: ${code}`);
  if (code.startsWith('0')) {
    sawZeroPrefix = true;
  }
}
assert(!isValidSessionCode('12345'), '5 digits must fail');
assert(!isValidSessionCode('1234567'), '7 digits must fail');
assert(!isValidSessionCode('12345a'), 'Non-digit must fail');
console.log('   ✓ 1,000 session codes generated and verified with 6-digit zero-padding.');

// 4. Constants
console.log('\n4. Verifying config constants:');
assert(constants.ATTENDANCE_WARNING_THRESHOLD === 75, 'Warning threshold must be 75');
assert(constants.DEFAULT_SESSION_MINUTES === 10, 'Default session duration must be 10');
assert(constants.MIN_SESSION_MINUTES === 1, 'Min session duration must be 1');
assert(constants.MAX_SESSION_MINUTES === 60, 'Max session duration must be 60');
assert(constants.DEFAULT_PAGE === 1, 'Default page must be 1');
assert(constants.DEFAULT_LIMIT === 20, 'Default limit must be 20');
assert(constants.MAX_LIMIT === 100, 'Max limit must be 100');
assert(constants.DEFAULT_JWT_EXPIRES_IN === '7d', 'JWT expiry must be 7d');
assert(constants.DEFAULT_BCRYPT_ROUNDS === 10, 'Bcrypt rounds must be 10');
console.log('   ✓ All constant values match requirements.');

console.log('\nAll Part 2.3 checks passed successfully!');
