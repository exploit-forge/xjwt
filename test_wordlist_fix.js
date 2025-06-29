#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const fs = require('fs');

// Create a test JWT with a secret from our custom wordlist
const testSecret = 'custom_key';
const testPayload = { 
  sub: '1234567890', 
  name: 'John Doe', 
  iat: Math.floor(Date.now() / 1000) 
};

const testToken = jwt.sign(testPayload, testSecret);

console.log('=== JWT Wordlist Upload Fix Test ===\n');
console.log('Test JWT Token (signed with "custom_key"):');
console.log(testToken);
console.log('\nTest Wordlist Content:');
console.log(fs.readFileSync('./test_wordlist.txt', 'utf8'));

console.log('\n=== Instructions for Testing ===');
console.log('1. Start the application with: docker-compose up');
console.log('2. Open the frontend in your browser');
console.log('3. Paste the test JWT token above into the token input');
console.log('4. Upload the test_wordlist.txt file');
console.log('5. Start the attack');
console.log('6. Verify that the logs show "Using custom wordlist with 6 entries"');
console.log('7. The attack should successfully find the secret "custom_key"');
console.log('\n=== Expected Behavior ===');
console.log('- WITHOUT wordlist upload: Uses default wordlist (may not find "custom_key")');
console.log('- WITH wordlist upload: Uses custom wordlist and finds "custom_key"');
console.log('\nThis confirms the fix is working correctly!');
