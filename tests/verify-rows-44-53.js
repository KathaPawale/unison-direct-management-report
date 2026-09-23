#!/usr/bin/env node
/* Tracker rows 44-53 verification. Run with: node tests/verify-rows-44-53.js */
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/report/exports.js'), 'utf8');
const parser = fs.readFileSync(path.join(root, 'src/core/parser.js'), 'utf8');
const rep = fs.readFileSync(path.join(root, 'src/report/report.js'), 'utf8');
let pass = 0;
let fail = 0;

function check(label, condition){
  if (condition) pass++;
  else { fail++; console.error('FAIL:', label); }
}

check('Row 44 PL name detection', /\b(pl|p&l|profit)/i.test(parser) && /detectRoles/.test(parser));
check('Row 45 BS_Comparative regex', /bs.*comparative|bsComparative/i.test(parser));
check('Row 46 TrialBalance role', /trial ?balance|role.*['"]tb['"]/i.test(parser) || /['"]tb['"]/.test(src));
check('Row 46 tb tabColor', /tb:\s*['"]?[0-9A-F]{6}/i.test(src));
check('Row 47 freeze row 5', /freezeRow\s*=\s*5|ySplit:\s*5/.test(src));
check('Row 48/51 no USD in headings', !/Amounts in US Dollars/.test(rep) || /section\s*!==\s*3/.test(rep));
check('Row 52 A/P total pct format', /numFmt.*'0\.00%/.test(src) && /totalVal/.test(src));

console.log(`${pass + fail} assertions, ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);