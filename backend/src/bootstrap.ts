// bootstrap.ts
// Load environment early, then start the server. This avoids import hoisting
// issues where modules (models) read process.env before dotenv is loaded.
import 'dotenv/config';
import './server';

console.log('bootstrap: loaded env and started server');
