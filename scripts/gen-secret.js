#!/usr/bin/env node
const crypto = require('crypto')

const bytes = Number(process.argv[2]) || 48
const secret = crypto.randomBytes(bytes).toString('base64url')

process.stdout.write(`${secret}\n`)
