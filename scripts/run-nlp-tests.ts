/**
 * Script to execute Sahayak 50+ NLP Quality Benchmark
 */
import { runSahayakNLPTests } from "../src/lib/kisan/sahayak/test-suite";

async function main() {
  console.log("=================================================");
  console.log("🌾 KISAN SETU SAHAYAK — ADVANCED NLP TEST RUNNER");
  console.log("=================================================\n");

  const results = await runSahayakNLPTests();

  console.log(`Total Test Queries: ${results.total}`);
  console.log(`Passed: ${results.passed} / ${results.total}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Intent & Entity Accuracy: ${results.accuracyPct}%\n`);

  console.log("---------------- Detailed Results ----------------");
  for (const r of results.results) {
    const mark = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`[${mark}] #${r.id.toString().padStart(2, "0")} [${r.category}] "${r.query}"`);
    if (!r.passed) {
      console.log(`       Expected: ${r.expectedPrimary}, Got: ${r.primaryIntent}`);
    }
  }

  console.log("\n=================================================");
  if (results.accuracyPct >= 95) {
    console.log("🎉 ALL QUALITY BENCHMARKS MET (Accuracy >= 95%)");
  } else {
    console.log("⚠️ QUALITY BENCHMARK WARNING: Review failed queries.");
  }
  console.log("=================================================");
}

main().catch(console.error);
