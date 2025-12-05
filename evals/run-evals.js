#!/usr/bin/env node

/**
 * Conversational Wizard EVALS Runner
 *
 * Tests the AI validation endpoint against a suite of test cases
 * Measures accuracy, response quality, and performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5173';
const AI_PROVIDER = process.env.AI_PROVIDER || 'local';
const OUTPUT_DIR = path.join(__dirname, 'results');
const TEST_CASES_FILE = path.join(__dirname, 'test-cases.json');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Results storage
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: 0,
  by_category: {},
  test_details: [],
  metrics: {
    avg_response_time: 0,
    total_time: 0,
    validation_accuracy: 0,
    typo_correction_rate: 0,
    command_recognition_rate: 0,
    natural_language_understanding: 0
  }
};

/**
 * Load test cases from JSON file
 */
function loadTestCases() {
  try {
    const data = fs.readFileSync(TEST_CASES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`${colors.red}Error loading test cases:${colors.reset}`, error.message);
    process.exit(1);
  }
}

/**
 * Get question configuration for a field
 */
function getQuestionConfig(field) {
  const questions = {
    program_name: { field: 'program_name', type: 'text', minLength: 3 },
    program_type: { field: 'program_type', type: 'select', options: ['corporate', 'fleet', 'meal', 'travel', 'gift', 'transport', 'healthcare', 'education'] },
    funding_model: { field: 'funding_model', type: 'select', options: ['prepaid', 'debit', 'credit', 'charge', 'hybrid'] },
    form_factor: { field: 'form_factor', type: 'multiselect', options: ['physical', 'virtual', 'tokenized'] },
    card_scheme: { field: 'card_scheme', type: 'select', options: ['Visa', 'Mastercard', 'American Express', 'Discover', 'UnionPay', 'JCB'] },
    currency: { field: 'currency', type: 'select', options: ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF'] },
    estimated_cards: { field: 'estimated_cards', type: 'number', minimum: 1 },
    daily_limit: { field: 'daily_limit', type: 'number', minimum: 0 },
    monthly_limit: { field: 'monthly_limit', type: 'number', minimum: 0 }
  };
  return questions[field] || { field, type: 'text' };
}

/**
 * Call the AI validation API
 */
async function callAIValidationAPI(input, step, conversationHistory = []) {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${API_URL}/api/ai-validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: AI_PROVIDER,
        action: 'validate',
        context: {
          current_question: getQuestionConfig(step),
          user_input: input,
          conversation_history: conversationHistory,
          collected_data: {}
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const duration = Date.now() - startTime;

    // Handle non-JSON responses gracefully
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { error: 'Non-JSON response', body: text.substring(0, 200) };
    }

    return {
      success: response.ok,
      data,
      duration,
      status: response.status
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Provide more detailed error messages
    let errorMessage = error.message;
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout (30s) - API may be unavailable';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused - API not available at ' + API_URL;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'API URL not found: ' + API_URL;
    }

    return {
      success: false,
      error: errorMessage,
      duration,
      originalError: error.code || error.name
    };
  }
}

/**
 * Check if arrays are equal (for multi-select fields)
 */
function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Run a single test case
 */
async function runTestCase(testCase) {
  console.log(`\n${colors.cyan}Running: ${testCase.id}${colors.reset}`);
  console.log(`${colors.gray}  Input: "${testCase.input}"${colors.reset}`);
  console.log(`${colors.gray}  Step: ${testCase.step}${colors.reset}`);

  const result = {
    id: testCase.id,
    category: testCase.category,
    description: testCase.description,
    passed: false,
    checks: [],
    duration: 0,
    error: null
  };

  try {
    const apiResult = await callAIValidationAPI(
      testCase.input,
      testCase.step,
      []
    );

    result.duration = apiResult.duration;

    if (!apiResult.success) {
      result.error = apiResult.error || 'API call failed';
      result.checks.push({
        name: 'API Success',
        passed: false,
        expected: 'success',
        actual: apiResult.status || 'error'
      });
      console.log(`${colors.red}  ✗ API call failed: ${result.error}${colors.reset}`);
      if (apiResult.status) {
        console.log(`${colors.gray}    Status: ${apiResult.status}${colors.reset}`);
      }
      if (apiResult.data && apiResult.data.error) {
        console.log(`${colors.gray}    Error: ${apiResult.data.error}${colors.reset}`);
      }
      return result;
    }

    const response = apiResult.data;

    // Check 1: Validation result
    if (testCase.expected_validation !== undefined) {
      const validationPassed = response.validated === testCase.expected_validation;
      result.checks.push({
        name: 'Validation Result',
        passed: validationPassed,
        expected: testCase.expected_validation,
        actual: response.validated
      });

      if (validationPassed) {
        console.log(`${colors.green}  ✓ Validation: ${response.validated}${colors.reset}`);
      } else {
        console.log(`${colors.red}  ✗ Validation: expected ${testCase.expected_validation}, got ${response.validated}${colors.reset}`);
      }
    }

    // Check 2: Extracted value
    if (testCase.expected_value !== undefined) {
      let valuePassed;

      if (Array.isArray(testCase.expected_value)) {
        valuePassed = arraysEqual(response.extracted_value, testCase.expected_value);
      } else {
        valuePassed = response.extracted_value === testCase.expected_value;
      }

      result.checks.push({
        name: 'Extracted Value',
        passed: valuePassed,
        expected: testCase.expected_value,
        actual: response.extracted_value
      });

      if (valuePassed) {
        console.log(`${colors.green}  ✓ Value: ${JSON.stringify(response.extracted_value)}${colors.reset}`);
      } else {
        console.log(`${colors.red}  ✗ Value: expected ${JSON.stringify(testCase.expected_value)}, got ${JSON.stringify(response.extracted_value)}${colors.reset}`);
      }
    }

    // Check 3: Command recognition
    if (testCase.expected_command) {
      const commandPassed = response.is_command && response.command === testCase.expected_command;
      result.checks.push({
        name: 'Command Recognition',
        passed: commandPassed,
        expected: testCase.expected_command,
        actual: response.command
      });

      if (commandPassed) {
        console.log(`${colors.green}  ✓ Command: ${response.command}${colors.reset}`);
      } else {
        console.log(`${colors.red}  ✗ Command: expected ${testCase.expected_command}, got ${response.command}${colors.reset}`);
      }
    }

    // Check 4: Response content
    if (testCase.expected_response_contains) {
      const responseText = response.ai_response?.toLowerCase() || '';
      const containsAll = testCase.expected_response_contains.every(
        phrase => responseText.includes(phrase.toLowerCase())
      );

      result.checks.push({
        name: 'Response Content',
        passed: containsAll,
        expected: testCase.expected_response_contains,
        actual: response.ai_response
      });

      if (containsAll) {
        console.log(`${colors.green}  ✓ Response contains expected phrases${colors.reset}`);
      } else {
        console.log(`${colors.red}  ✗ Response missing expected phrases${colors.reset}`);
        console.log(`${colors.gray}    Response: "${response.ai_response}"${colors.reset}`);
      }
    }

    // Overall pass/fail
    result.passed = result.checks.every(check => check.passed);

    if (result.passed) {
      console.log(`${colors.green}  ✓ PASSED${colors.reset} (${result.duration}ms)`);
    } else {
      console.log(`${colors.red}  ✗ FAILED${colors.reset} (${result.duration}ms)`);
    }

  } catch (error) {
    result.error = error.message;
    console.log(`${colors.red}  ✗ ERROR: ${error.message}${colors.reset}`);
  }

  return result;
}

/**
 * Calculate metrics from results
 */
function calculateMetrics() {
  const totalDuration = results.test_details.reduce((sum, t) => sum + t.duration, 0);
  results.metrics.avg_response_time = totalDuration / results.total;
  results.metrics.total_time = totalDuration;
  results.metrics.validation_accuracy = (results.passed / results.total) * 100;

  // Category-specific metrics
  const typoTests = results.test_details.filter(t => t.category === 'typo_correction');
  results.metrics.typo_correction_rate = typoTests.length > 0
    ? (typoTests.filter(t => t.passed).length / typoTests.length) * 100
    : 0;

  const commandTests = results.test_details.filter(t => t.category === 'commands');
  results.metrics.command_recognition_rate = commandTests.length > 0
    ? (commandTests.filter(t => t.passed).length / commandTests.length) * 100
    : 0;

  const nlTests = results.test_details.filter(t =>
    t.category === 'validation' && t.description.includes('Natural language')
  );
  results.metrics.natural_language_understanding = nlTests.length > 0
    ? (nlTests.filter(t => t.passed).length / nlTests.length) * 100
    : 0;
}

/**
 * Print summary report
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}EVALUATION SUMMARY${colors.reset}`);
  console.log('='.repeat(60));

  console.log(`\n${colors.cyan}Overall Results:${colors.reset}`);
  console.log(`  Total Tests: ${results.total}`);
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}Errors: ${results.errors}${colors.reset}`);
  console.log(`  Accuracy: ${results.metrics.validation_accuracy.toFixed(1)}%`);

  console.log(`\n${colors.cyan}Performance:${colors.reset}`);
  console.log(`  Total Time: ${results.metrics.total_time}ms`);
  console.log(`  Avg Response Time: ${results.metrics.avg_response_time.toFixed(0)}ms`);

  console.log(`\n${colors.cyan}Category Metrics:${colors.reset}`);
  console.log(`  Typo Correction: ${results.metrics.typo_correction_rate.toFixed(1)}%`);
  console.log(`  Command Recognition: ${results.metrics.command_recognition_rate.toFixed(1)}%`);
  console.log(`  Natural Language: ${results.metrics.natural_language_understanding.toFixed(1)}%`);

  console.log(`\n${colors.cyan}By Category:${colors.reset}`);
  Object.entries(results.by_category).forEach(([category, stats]) => {
    const percentage = (stats.passed / stats.total) * 100;
    const color = percentage >= 80 ? colors.green : percentage >= 60 ? colors.yellow : colors.red;
    console.log(`  ${category}: ${color}${stats.passed}/${stats.total} (${percentage.toFixed(0)}%)${colors.reset}`);
  });

  console.log('\n' + '='.repeat(60));
}

/**
 * Save results to JSON file
 */
function saveResults() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      console.log(`${colors.gray}Creating results directory: ${OUTPUT_DIR}${colors.reset}`);
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `eval-results-${timestamp}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    // Save timestamped results
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`${colors.cyan}Results saved to: ${filepath}${colors.reset}`);

    // Also save latest.json for easy access (this is what CI/CD reads)
    const latestPath = path.join(OUTPUT_DIR, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(results, null, 2));
    console.log(`${colors.cyan}Latest results saved to: ${latestPath}${colors.reset}`);

    return true;
  } catch (error) {
    console.error(`${colors.red}ERROR: Failed to save results:${colors.reset}`, error.message);
    console.error(`${colors.red}Output directory: ${OUTPUT_DIR}${colors.reset}`);
    console.error(`${colors.red}Current directory: ${process.cwd()}${colors.reset}`);
    console.error(error.stack);
    return false;
  }
}

/**
 * Check if API is available
 */
async function checkAPIHealth() {
  console.log(`${colors.gray}Checking API health...${colors.reset}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_URL}/api/configurations/schema`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeout);

    // Accept 200 (OK) or 401 (Unauthorized) as "API is available"
    // 401 means the API is running, just requires auth (which is fine)
    if (response.ok) {
      console.log(`${colors.green}✓ API is available (status ${response.status})${colors.reset}`);
      return true;
    } else if (response.status === 401) {
      console.log(`${colors.green}✓ API is available (requires auth, but responding)${colors.reset}`);
      return true;
    } else if (response.status >= 500) {
      // 5xx errors mean server is having issues
      console.log(`${colors.red}✗ API returned server error ${response.status}${colors.reset}`);
      return false;
    } else {
      // 4xx errors (except 401) - API is up but something is wrong
      console.log(`${colors.yellow}⚠ API returned status ${response.status} (treating as available)${colors.reset}`);
      return true; // API is responding, so let's try to run tests
    }
  } catch (error) {
    console.log(`${colors.red}✗ API health check failed: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}API URL: ${API_URL}${colors.reset}`);
    console.log(`${colors.yellow}Make sure the API is running and accessible${colors.reset}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.blue}Conversational Wizard EVALS${colors.reset}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`AI Provider: ${AI_PROVIDER}`);
  console.log('='.repeat(60));

  // Check API health before running tests
  const apiAvailable = await checkAPIHealth();
  if (!apiAvailable) {
    console.log(`\n${colors.red}ERROR: API is not available. Cannot run EVALS.${colors.reset}`);
    console.log(`${colors.yellow}Tip: Check that API_URL is correct and the service is deployed${colors.reset}`);

    // Save error results so CI/CD can report the issue
    console.log(`\n${colors.cyan}Saving error results...${colors.reset}`);
    results.errors = 1;
    results.total = 0;
    results.passed = 0;
    results.failed = 0;
    results.metrics.fatal_error = 'API not available';
    results.metrics.api_url = API_URL;
    results.metrics.validation_accuracy = 0;

    const saved = saveResults();
    if (saved) {
      console.log(`${colors.green}✓ Error results saved successfully${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Failed to save error results${colors.reset}`);
    }

    process.exit(1);
  }

  // Give serverless functions time to warm up
  console.log(`\n${colors.gray}Waiting 5 seconds for API to warm up...${colors.reset}`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log(`${colors.green}✓ Ready to run tests${colors.reset}`);

  const testData = loadTestCases();
  const testCases = testData.test_cases;

  console.log(`\nLoaded ${testCases.length} test cases`);

  // Run all test cases
  for (const testCase of testCases) {
    const result = await runTestCase(testCase);

    results.total++;
    results.test_details.push(result);

    if (result.error) {
      results.errors++;
    } else if (result.passed) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Track by category
    if (!results.by_category[testCase.category]) {
      results.by_category[testCase.category] = { total: 0, passed: 0, failed: 0 };
    }
    results.by_category[testCase.category].total++;
    if (result.passed) {
      results.by_category[testCase.category].passed++;
    } else {
      results.by_category[testCase.category].failed++;
    }
  }

  calculateMetrics();
  printSummary();
  saveResults();

  // Exit with success if accuracy meets threshold (85%)
  const ACCURACY_THRESHOLD = 85;
  const accuracyMet = results.metrics.validation_accuracy >= ACCURACY_THRESHOLD;

  if (accuracyMet) {
    console.log(`\n${colors.green}✓ SUCCESS: Accuracy ${results.metrics.validation_accuracy.toFixed(1)}% meets threshold ${ACCURACY_THRESHOLD}%${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}✗ FAILED: Accuracy ${results.metrics.validation_accuracy.toFixed(1)}% below threshold ${ACCURACY_THRESHOLD}%${colors.reset}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  console.error(error.stack);

  // Save partial results even on fatal error
  try {
    results.metrics.fatal_error = error.message;
    results.metrics.error_stack = error.stack;
    saveResults();
    console.log(`${colors.yellow}Partial results saved despite fatal error${colors.reset}`);
  } catch (saveError) {
    console.error(`${colors.red}Could not save results:${colors.reset}`, saveError.message);
  }

  process.exit(1);
});
