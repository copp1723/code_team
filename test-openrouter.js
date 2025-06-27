#!/usr/bin/env node

const https = require('https');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.OPENROUTER_API_KEY;

console.log('Testing OpenRouter API connection...');
console.log('API Key present:', !!apiKey);
console.log('API Key length:', apiKey ? apiKey.length : 0);
console.log('API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A');

// Test API call
const data = JSON.stringify({
  model: 'openai/gpt-3.5-turbo',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say hello' }
  ],
  temperature: 0.7,
  max_tokens: 50
});

const options = {
  hostname: 'openrouter.ai',
  port: 443,
  path: '/api/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'HTTP-Referer': 'https://github.com/test',
    'X-Title': 'Test Script'
  }
};

console.log('\nMaking test request to OpenRouter...');

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Status Message:', res.statusMessage);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('\nResponse body:');
    try {
      const response = JSON.parse(body);
      console.log(JSON.stringify(response, null, 2));
      
      if (response.error) {
        console.error('\n❌ API Error:', response.error);
      } else if (response.choices && response.choices[0]) {
        console.log('\n✅ API call successful!');
        console.log('Response:', response.choices[0].message.content);
      }
    } catch (e) {
      console.error('Failed to parse response:', e.message);
      console.log('Raw response:', body);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(data);
req.end();