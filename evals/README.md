# Conversational Wizard EVALS

Automated evaluation system for testing the AI-powered conversational wizard's validation accuracy, natural language understanding, and user experience.

## Overview

This EVALS framework tests the `/api/ai-validate` endpoint against a comprehensive suite of test cases covering:

- ✅ **Input Validation** - Correct/incorrect values
- 🗣️ **Natural Language Understanding** - Conversational inputs
- 🔤 **Typo Correction** - Common misspellings
- ⌨️ **Command Recognition** - help, back, summary, skip, reset
- 👋 **Greeting Detection** - User greetings mid-flow
- 🔢 **Number Extraction** - "about 500", "2,000", etc.
- ➕ **Math Expressions** - "500 + 200", "daily * 30"
- 🎯 **Multi-Select** - "all", comma-separated, "and" separator
- 💬 **Response Quality** - Helpful, conversational tone

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run EVALS

```bash
# Local development
npm run evals

# Test against deployed API
API_URL=https://your-app.vercel.app npm run evals

# Test specific AI provider
AI_PROVIDER=anthropic npm run evals
AI_PROVIDER=openai npm run evals
AI_PROVIDER=local npm run evals
```

### 3. View Results

Results are saved to `evals/results/`:
- `latest.json` - Most recent run
- `eval-results-<timestamp>.json` - Timestamped results

## Test Cases

Test cases are defined in `test-cases.json`. Each test case includes:

```json
{
  "id": "unique-test-id",
  "category": "validation|typo_correction|commands|etc",
  "step": "program_type",
  "input": "user input text",
  "expected_validation": true,
  "expected_value": "corporate",
  "expected_response_contains": ["phrase1", "phrase2"],
  "description": "What this test validates"
}
```

### Test Categories

| Category | Description | Count |
|----------|-------------|-------|
| `validation` | Standard validation tests | 18 |
| `greetings` | Greeting detection | 2 |
| `typo_correction` | Typo handling | 2 |
| `commands` | Command recognition | 4 |
| `corrections` | User self-corrections | 1 |
| `questions` | User questions about options | 1 |
| `math` | Math expression evaluation | 2 |

**Total:** 45 test cases

## Metrics

The evaluation script calculates:

### Overall Metrics
- **Total Tests** - Number of test cases run
- **Passed/Failed/Errors** - Test results breakdown
- **Validation Accuracy** - % of tests passed

### Performance Metrics
- **Total Time** - Time to run all tests
- **Avg Response Time** - Average API response time

### Category-Specific Metrics
- **Typo Correction Rate** - % of typos correctly handled
- **Command Recognition Rate** - % of commands recognized
- **Natural Language Understanding** - % of NL inputs correctly interpreted

## Example Output

```
==========================================================
EVALUATION SUMMARY
==========================================================

Overall Results:
  Total Tests: 45
  Passed: 42
  Failed: 3
  Errors: 0
  Accuracy: 93.3%

Performance:
  Total Time: 12450ms
  Avg Response Time: 277ms

Category Metrics:
  Typo Correction: 100.0%
  Command Recognition: 100.0%
  Natural Language: 88.9%

By Category:
  validation: 16/18 (89%)
  greetings: 2/2 (100%)
  typo_correction: 2/2 (100%)
  commands: 4/4 (100%)
  corrections: 1/1 (100%)
  questions: 1/1 (100%)
  math: 2/2 (100%)

==========================================================
```

## Adding New Test Cases

1. **Open** `test-cases.json`
2. **Add** a new test case:

```json
{
  "id": "my-new-test",
  "category": "validation",
  "step": "program_type",
  "input": "we need cards for our restaurant",
  "expected_validation": true,
  "expected_value": "meal",
  "expected_response_contains": ["meal"],
  "description": "Restaurant mention → meal card type"
}
```

3. **Run** evals: `npm run evals`

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Conversational Wizard EVALS
  run: |
    npm run evals
  env:
    API_URL: ${{ secrets.VERCEL_URL }}
    AI_PROVIDER: local
```

## Benchmarking Different Providers

Compare AI providers:

```bash
# Test local validation
AI_PROVIDER=local npm run evals > results-local.txt

# Test Anthropic
AI_PROVIDER=anthropic npm run evals > results-anthropic.txt

# Test OpenAI
AI_PROVIDER=openai npm run evals > results-openai.txt

# Compare results
diff results-local.txt results-anthropic.txt
```

## Continuous Improvement

### Track Progress Over Time

```bash
# Run evals daily
0 0 * * * cd /path/to/project && npm run evals

# Compare today vs. yesterday
node evals/compare-results.js results/latest.json results/eval-results-2024-11-26.json
```

### Identify Weaknesses

Check `latest.json` for failed tests:

```bash
jq '.test_details[] | select(.passed == false) | {id, description, checks}' evals/results/latest.json
```

### Improve Prompts

1. Find failing test cases
2. Update AI prompt in `api/ai-validate.js`
3. Re-run evals
4. Iterate until all pass

## Advanced Usage

### Filter Test Cases

Run specific categories:

```javascript
// Modify run-evals.js
const testCases = testData.test_cases.filter(t => t.category === 'typo_correction');
```

### Custom Metrics

Add your own metrics in `calculateMetrics()`:

```javascript
// Example: Measure greeting friendliness
const greetingTests = results.test_details.filter(t => t.category === 'greetings');
results.metrics.greeting_friendliness =
  greetingTests.filter(t =>
    t.checks.find(c => c.name === 'Response Content')?.passed
  ).length / greetingTests.length * 100;
```

### Load Testing

Test under load:

```javascript
// Run 100 tests concurrently
const promises = Array(100).fill(null).map(() =>
  callAIValidationAPI('corporate', 'program_type')
);
const results = await Promise.all(promises);
```

## Best Practices

### 1. Run Before Deploy
Always run evals before deploying prompt changes:
```bash
npm run evals && git push
```

### 2. Set Acceptance Criteria
Define minimum thresholds:
- Overall accuracy: ≥ 90%
- Typo correction: ≥ 95%
- Command recognition: 100%
- Avg response time: ≤ 300ms

### 3. Test Edge Cases
Add tests for:
- Empty input
- Very long input (>1000 chars)
- Special characters
- Unicode/emoji
- Multiple languages

### 4. Monitor Production
Run evals against production weekly to catch regressions.

## Troubleshooting

### All Tests Failing
- Check API_URL is correct
- Verify API is running
- Check network connectivity

### High Response Times
- Check AI provider rate limits
- Verify API endpoint performance
- Consider caching responses

### Inconsistent Results
- AI providers can have non-deterministic responses
- Run multiple times and average results
- Use temperature=0 for more consistent outputs

## File Structure

```
evals/
├── README.md              # This file
├── test-cases.json        # Test case definitions
├── run-evals.js           # Main evaluation script
└── results/               # Generated results
    ├── latest.json        # Most recent results
    └── eval-results-*.json # Timestamped results
```

## Future Enhancements

- [ ] Web UI for viewing results
- [ ] Regression detection
- [ ] Performance benchmarking
- [ ] Multi-language support
- [ ] A/B testing different prompts
- [ ] User session replay
- [ ] Real user input testing

## Contributing

To add test cases:
1. Identify a failure mode or edge case
2. Add test case to `test-cases.json`
3. Run evals to verify
4. Submit PR with test case and any prompt improvements

---

**Questions?** Check the main project README or open an issue.
