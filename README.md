# repo

This repository is powered by [intenti&ouml;n agentic-lib](https://github.com/polycode-public/agentic-lib) — autonomous code transformation driven by GitHub Copilot. Write a mission, and the system generates issues, writes code, runs tests, and opens pull requests.

## Getting Started

### Step 1: Create Your Repository

Click **"Use this template"** on the [repository0](https://github.com/polycode-public/repository0) page, or use the GitHub CLI:

```bash
gh repo create my-project --template polycode-public/repository0 --public --clone
cd my-project
```

### Step 2: Initialise with a Mission

Run the init workflow from the GitHub Actions tab (**agentic-lib-init** with mode=purge), or use the CLI:

```bash
npx @polycode-public/agentic-lib init --purge --mission 7-kyu-understand-fizz-buzz
```

This resets the repository to a clean state with your chosen intent in `INTENT.md`. The default intent is **fizz-buzz** (7-kyu).

#### Built-in Missions

agentic-lib ships with 20 built-in missions plus two special modes, graded using [Codewars kyu/dan](https://docs.codewars.com/concepts/kata/) difficulty:

| Mission | Kyu/Dan | Description |
|---------|---------|-------------|
| `random` | — | Randomly select from all built-in missions |
| `generate` | — | Ask the LLM to generate a novel mission |
| `8-kyu-remember-empty` | 8 kyu | Blank template |
| `8-kyu-remember-hello-world` | 8 kyu | Hello World |
| `7-kyu-understand-fizz-buzz` | 7 kyu | Classic FizzBuzz (default) |
| `6-kyu-understand-hamming-distance` | 6 kyu | Hamming distance (strings + bits) |
| `6-kyu-understand-roman-numerals` | 6 kyu | Roman numeral conversion |
| `5-kyu-apply-ascii-face` | 5 kyu | ASCII face art |
| `5-kyu-apply-string-utils` | 5 kyu | 10 string utility functions |
| `4-kyu-apply-cron-engine` | 4 kyu | Cron expression parser |
| `4-kyu-apply-dense-encoding` | 4 kyu | Dense binary encoding |
| `4-kyu-analyze-json-schema-diff` | 4 kyu | JSON Schema diff |
| `3-kyu-analyze-lunar-lander` | 3 kyu | Lunar lander simulation |
| `3-kyu-evaluate-time-series-lab` | 3 kyu | Time series analysis |
| `2-kyu-create-markdown-compiler` | 2 kyu | Markdown compiler |
| `2-kyu-create-plot-code-lib` | 2 kyu | Code visualization library |
| `1-kyu-create-ray-tracer` | 1 kyu | Ray tracer |
| `1-dan-create-c64-emulator` | 1 dan | C64 emulator |
| `1-dan-create-planning-engine` | 1 dan | Planning engine |
| `2-dan-create-self-hosted` | 2 dan | Self-hosted AGI vision |

List all available missions:

```bash
npx @polycode-public/agentic-lib iterate --list-missions
```

#### Write Your Own Mission

Edit `INTENT.md` directly — describe what you want to build, the features, requirements, and acceptance criteria as checkboxes:

```markdown
# Mission

Build a CLI tool that converts CSV files to formatted Markdown tables.

## Features
- Read CSV from file or stdin
- Auto-detect delimiter

## Acceptance Criteria
- [ ] Reading a CSV with 3 columns produces a 3-column Markdown table
- [ ] All unit tests pass
```

### Step 3: Enable GitHub Copilot and Configure Secrets

Add these secrets in **Settings > Secrets and variables > Actions**:

| Secret | How to create | Purpose |
|--------|---------------|---------|
| `COPILOT_GITHUB_TOKEN` | [Fine-grained PAT](https://github.com/settings/tokens?type=beta) with **GitHub Copilot** > Read | Authenticates with the Copilot SDK |
| `WORKFLOW_TOKEN` | [Classic PAT](https://github.com/settings/tokens) with **workflow** scope | Allows init to update workflow files |

Then in **Settings > Actions > General**:
- Workflow permissions: **Read and write permissions**
- Allow GitHub Actions to create PRs: **Checked**

### Step 4: Activate the Schedule

Workflows ship with schedule **off** by default. Activate them from the GitHub Actions tab by running **agentic-lib-schedule** with your desired frequency:

| Frequency | Workflow runs | Init runs | Test runs |
|-----------|--------------|-----------|-----------|
| continuous | Every 20 min | Every 4 hours | Every hour |
| hourly | Every hour | Every day | Every 4 hours |
| daily | Every day | Every week | Every day |
| weekly | Every week | Every month | Every week |
| off | Never | Never | Never |

## How It Works

```
INTENT.md -> [supervisor] -> dispatch workflows -> Issue -> Code -> Test -> PR -> Merge
                                                     ^                           |
                                                     +---------------------------+
```

The pipeline runs as GitHub Actions workflows. An LLM supervisor gathers repository context and dispatches other workflows. Each workflow uses the Copilot SDK to make targeted changes.

## API

### `encode(bytes, name)`

Encodes a Uint8Array to a string using the specified encoding.

**Arguments:**
- `bytes` (Uint8Array): The binary data to encode
- `name` (string): The encoding name — `"base62"` or `"base85"`

**Returns:** An encoded string using only the encoding's charset.

**Throws:** Error if the encoding is unknown or bytes is not a Uint8Array.

**Leading zeros:** The function preserves leading zero bytes through the round-trip, ensuring `decode(encode(b, name), name)` equals `b` for all inputs.

### `decode(str, name)`

Decodes a string back to a Uint8Array using the specified encoding.

**Arguments:**
- `str` (string): The encoded string
- `name` (string): The encoding name — `"base62"` or `"base85"`

**Returns:** A Uint8Array matching the original input to `encode`.

**Throws:** Error if the encoding is unknown or the string contains invalid characters for that encoding.

## Built-in Encodings

- `base62` — charset `0-9a-zA-Z`, ~5.95 bits/char, 22 chars for a UUID
- `base85` — charset `!#$%&'()*+,-./0-9:;<=>?@A-Z[\]^_a-z{|}~`, ~6.41 bits/char, 20 chars for a UUID

## Examples

```js
import { encode, decode } from './src/lib/main.js';

// Encode/decode a UUID (16 bytes)
const uuid = new Uint8Array([0x55, 0x7e, 0x40, 0x14, 0x36, 0x08, 0xc4, 0x2f, 0xab, 0x14, 0x99, 0xf0, 0xd5, 0x15, 0x6e, 0xc7]);

const encoded62 = encode(uuid, 'base62');
console.log(encoded62); // 22-character string
console.log(decode(encoded62, 'base62')); // Uint8Array(...) matching original

const encoded85 = encode(uuid, 'base85');
console.log(encoded85); // 20-character string
console.log(decode(encoded85, 'base85')); // Uint8Array(...) matching original

// Edge cases: leading zeros are preserved
const leadingZeros = new Uint8Array([0, 0, 5]);
console.log(decode(encode(leadingZeros, 'base62'), 'base62')); // Uint8Array(3) [0, 0, 5]
```

### `parseCron(expr)`

Parses a cron expression string into a structured object. Supports standard 5-field and 6-field (with seconds) formats, ranges, lists, steps, wildcards, and shortcuts.

**Supported shortcuts:**
- `@yearly` or `@annually` → `0 0 1 1 *`
- `@monthly` → `0 0 1 * *`
- `@weekly` → `0 0 * * 0`
- `@daily` or `@midnight` → `0 0 * * *`
- `@hourly` → `0 * * * *`

**Returns:** A structured object with `{ hasSeconds: boolean, fields: {...} }`

**Throws:** Descriptive error on invalid syntax, out-of-range fields, or wrong field count.

### `cronToString(parsed)`

Serializes a parsed cron object back to a cron string. Enables round-tripping of cron expressions.

**Returns:** A canonical cron expression string.

**Throws:** Error if the parsed object is malformed or missing required fields.

### `matches(expr, date)`

Checks whether a specific UTC date satisfies a cron expression.

**Arguments:**
- `expr` (string): A cron expression (5 or 6 fields)
- `date` (Date): A UTC Date object to test

**Returns:** `true` if the date matches the expression, `false` otherwise.

**Throws:** Error if the date is not a Date instance or if the expression is invalid.

### `nextRun(expr, after = new Date())`

Computes the next UTC time at or after `after` that matches the cron expression.

**Arguments:**
- `expr` (string): A cron expression (5 or 6 fields)
- `after` (Date, optional): The start time (defaults to current UTC time). The next matching time will be after this moment.

**Returns:** A UTC Date object representing the next matching time.

**Throws:** Error if no match is found within 4 years, or if arguments are invalid.

### `nextRuns(expr, count, after = new Date())`

Computes the next `count` UTC times after `after` that match the cron expression.

**Arguments:**
- `expr` (string): A cron expression (5 or 6 fields)
- `count` (number): The number of matching times to find (must be positive)
- `after` (Date, optional): The start time (defaults to current UTC time)

**Returns:** An array of UTC Date objects, sorted in ascending order, all matching the expression.

**Throws:** Error if count is invalid, if no matches are found within 4 years, or if arguments are invalid.

## Examples

Node (ESM):

```js
import { parseCron, cronToString } from './src/lib/main.js';

// Parse a cron expression
const parsed = parseCron('0 9 * * 1');
console.log(parsed);
// Output:
// {
//   hasSeconds: false,
//   fields: {
//     minute: { type: 'value', value: 0 },
//     hour: { type: 'value', value: 9 },
//     day: { type: 'wildcard', range: [1, 31] },
//     month: { type: 'wildcard', range: [1, 12] },
//     dayOfWeek: { type: 'value', value: 1 }
//   }
// }

// Convert back to string
console.log(cronToString(parsed)); // '0 9 * * 1'

// Using shortcuts
console.log(cronToString(parseCron('@daily'))); // '0 0 * * *'

// Parse every 15 minutes
const everyFifteen = parseCron('*/15 * * * *');
console.log(cronToString(everyFifteen)); // '*/15 * * * *'

// Check if a date matches an expression
import { matches, nextRun, nextRuns } from './src/lib/main.js';

const christmas = new Date('2025-12-25T00:00:00Z');
console.log(matches('0 0 25 12 *', christmas)); // true

// Find the next Monday at 9 AM UTC
const nextMonday9 = nextRun('0 9 * * 1', new Date('2025-06-15T00:00:00Z'));
console.log(nextMonday9); // 2025-06-16T09:00:00Z (next Monday)

// Find the next 7 daily runs starting from now
const nextWeek = nextRuns('@daily', 7);
console.log(nextWeek); // [Date, Date, Date, ...]

// Find the next 5 runs every 15 minutes
const next5x15min = nextRuns('*/15 * * * *', 5, new Date());
console.log(next5x15min.map(d => d.toISOString()));
```

## Configuration

Edit `agentic-lib.toml` to tune the system:

```toml
[schedule]
supervisor = "off"          # off | weekly | daily | hourly | continuous
focus = "mission"           # mission | maintenance

[tuning]
profile = "max"             # min | med | max
model = "gpt-5-mini"       # gpt-5-mini | claude-sonnet-4 | gpt-4.1

[mission-complete]
acceptance-criteria-threshold = 50   # % of criteria that must be met
min-resolved-issues = 1              # minimum closed issues
```

## File Layout

```
src/lib/main.js              <- library (browser-safe)
src/web/index.html            <- web page (imports ./lib.js)
tests/unit/main.test.js       <- unit tests
tests/behaviour/              <- Playwright E2E
```

## Updating

The `init` workflow updates the agentic infrastructure automatically. To update manually:

```bash
npx @polycode-public/agentic-lib@latest init --purge
```

## Links

- [INTENT.md](INTENT.md) — your project goals
- [agentic-lib documentation](https://github.com/polycode-public/agentic-lib) — full SDK docs
- [intenti&ouml;n website](https://xn--intenton-z2a.com)
