function choice(id, label, description, consequence, deltas, options = {}) {
  return Object.freeze({
    id,
    label,
    description,
    consequence,
    deltas: Object.freeze({ ...deltas }),
    recommended: options.recommended === true,
    effect: Object.freeze({ ...(options.effect || {}) }),
  });
}

function gate(id, stage, prompt, teachingPoint, choices) {
  return Object.freeze({
    id,
    stage,
    prompt,
    teachingPoint,
    choices: Object.freeze(choices),
  });
}

export const SCENARIOS = Object.freeze([
  Object.freeze({
    id: "clarity-gap",
    indexLabel: "01",
    title: "The Shape of Done Is Missing",
    category: "Unclear requirements",
    brief: "A local dashboard request says “make recovery clearer,” but it names no user, acceptance condition, source of truth, or allowed file boundary.",
    constraints: Object.freeze([
      "Local-only planning fixture",
      "No write scope is currently authorized",
      "A similar recovery surface already exists",
    ]),
    gates: Object.freeze([
      gate("discover", "Discover", "What do you establish first?", "Clarifications belong in the route evidence before implementation is suggested.", [
        choice("clarify-outcome", "Define the evidence of done", "Ask which operator, failure state, canonical evidence, and acceptance checks the change must support.", "The ambiguity becomes four answerable clarification fields.", { scope: 16, safety: 8, evidence: 14, efficiency: 4 }, { recommended: true }),
        choice("copy-old-ui", "Copy the nearest recovery screen", "Assume the existing surface captures the intent.", "Similarity is not evidence; the route inherits an unverified assumption.", { scope: -12, safety: -8, evidence: -12, efficiency: 4 }, { effect: { violation: 1 } }),
        choice("open-everything", "Inventory every project file", "Expand discovery until the right screen appears.", "The search becomes broader than the request and increases irrelevant exposure.", { scope: -15, safety: -5, evidence: 2, efficiency: -14 }),
      ]),
      gate("bound", "Bound", "How do you constrain the preview while answers are pending?", "TSF route previews can make allowed reads, writes, prohibitions, and stop conditions explicit.", [
        choice("read-only-sources", "Bind a read-only source set", "Allow only recovery UI, contracts, and acceptance docs; prohibit writes, network, and execution.", "The preview can gather evidence without pretending implementation is authorized.", { scope: 15, safety: 16, evidence: 8, efficiency: 6 }, { recommended: true }),
        choice("temporary-write", "Allow a temporary prototype write", "Use a disposable branch to learn what the requester meant.", "A branch does not create authority; the unresolved scope now has side effects.", { scope: -13, safety: -14, evidence: -3, efficiency: 4 }, { effect: { violation: 1 } }),
        choice("wait-without-record", "Pause informally", "Tell the requester you need details, but omit the unresolved fields from the route record.", "The pause is safe, but the next handoff cannot see why it happened.", { scope: 4, safety: 8, evidence: -11, efficiency: -4 }),
      ]),
      gate("preview", "Preview", "Which recommendation best matches the evidence?", "A preview recommends a route; it does not execute, enqueue, approve, or assign work.", [
        choice("clarification-preview", "Return a clarification-first preview", "Name the missing fields, retain the read-only boundary, and recommend no implementation yet.", "The preview is useful without overstating readiness.", { scope: 15, safety: 14, evidence: 14, efficiency: 5 }, { recommended: true }),
        choice("safe-local", "Classify as ready for local implementation", "Treat the request as low risk because it is a UI change.", "Low blast radius does not resolve an unknown acceptance condition or overlapping surface.", { scope: -14, safety: -12, evidence: -13, efficiency: 5 }, { effect: { violation: 1 } }),
        choice("escalate-everything", "Escalate the entire project", "Request broad approval for all recovery work.", "The recommendation is safe but too broad to be decision-ready.", { scope: -10, safety: 6, evidence: 1, efficiency: -12 }),
      ]),
      gate("verify", "Verify", "New answers arrive. What evidence makes the route ready?", "Evidence should be source-bound and specific enough for a later admission decision.", [
        choice("verify-answers", "Bind answers to acceptance checks", "Record the target operator, exact failed state, canonical receipt view, and two observable checks.", "The route now has testable boundaries and a traceable source lineage.", { scope: 14, safety: 8, evidence: 18, efficiency: 8 }, { recommended: true }),
        choice("accept-chat-summary", "Use the chat summary alone", "Treat the latest prose response as sufficient proof.", "The intent is clearer, but acceptance and source bindings remain weak.", { scope: 3, safety: -3, evidence: -11, efficiency: 7 }),
        choice("skip-overlap-check", "Skip the existing-surface comparison", "The requester confirmed the desired result, so overlap no longer matters.", "The route can still collide with an existing implementation.", { scope: -5, safety: -8, evidence: -7, efficiency: 5 }),
      ]),
      gate("decide", "Decide", "How should this synthetic mission conclude?", "A bounded recommendation can be complete even though no work has executed.", [
        choice("issue-bounded", "Issue the bounded recommendation", "Return the read/write boundaries, checks, prohibitions, source bindings, and explicit no-execution posture.", "The synthetic route succeeds as a decision-ready preview—not as completed implementation.", { scope: 12, safety: 12, evidence: 12, efficiency: 9, recovery: 5 }, { recommended: true, effect: { terminal: "success" } }),
        choice("claim-complete", "Mark the change complete", "The route is clear enough that completion is implied.", "A preview cannot claim execution, validation, admission, or completion.", { scope: -18, safety: -18, evidence: -16, efficiency: 2 }, { effect: { violation: 2, terminal: "failed" } }),
        choice("hold-forever", "Keep the mission on hold", "Avoid any recommendation until implementation is also approved.", "Caution is preserved, but the now-sufficient preview evidence is not used.", { scope: 2, safety: 7, evidence: 2, efficiency: -15 }, { effect: { terminal: "partial" } }),
      ]),
    ]),
  }),
  Object.freeze({
    id: "production-risk",
    indexLabel: "02",
    title: "Friday Production Shortcut",
    category: "Risky production change",
    brief: "A request asks for a direct production configuration edit before a weekend event. It includes urgency, but no approval evidence, rollback plan, or verified maintenance window.",
    constraints: Object.freeze([
      "Production write requested",
      "No approval evidence is attached",
      "No rollback or validation receipt exists",
    ]),
    gates: Object.freeze([
      gate("discover", "Discover", "Which missing facts determine whether this can be routed?", "Risk language is useful only when tied to authority, rollback, and observable validation.", [
        choice("find-authority", "Locate authority and rollback evidence", "Ask for exact owner, approved window, rollback path, affected surface, and validation checks.", "The request is reframed around evidence rather than urgency.", { scope: 14, safety: 17, evidence: 15, efficiency: 2 }, { recommended: true }),
        choice("trust-requester", "Treat requester urgency as approval", "The request comes from someone familiar with the system.", "Familiarity and urgency are not canonical approval evidence.", { scope: -8, safety: -18, evidence: -15, efficiency: 8 }, { effect: { violation: 1 } }),
        choice("research-production", "Inspect the live system directly", "Gather current values before deciding.", "The fixture has no authority for live access, and the capsule never connects to production.", { scope: -12, safety: -18, evidence: -8, efficiency: -5 }, { effect: { violation: 1 } }),
      ]),
      gate("bound", "Bound", "What access posture is defensible?", "Verified TSF preview semantics include no-network and route-preview-only boundaries.", [
        choice("preview-only", "Keep the route preview-only", "Permit local source review only; prohibit network, production writes, execution, and credential discovery.", "The request can be assessed without increasing blast radius.", { scope: 15, safety: 18, evidence: 8, efficiency: 5 }, { recommended: true }),
        choice("read-production", "Allow read-only production access", "Reading is harmless and would improve confidence.", "Even read access is outside the evidenced boundary and can expose sensitive state.", { scope: -7, safety: -14, evidence: 2, efficiency: 2 }, { effect: { violation: 1 } }),
        choice("prepare-command", "Draft the exact production command", "Do not run it; just make execution faster later.", "The route shifts toward an unapproved operational action before prerequisites exist.", { scope: -9, safety: -10, evidence: -3, efficiency: 7 }),
      ]),
      gate("preview", "Preview", "How should the request be classified?", "BLOCKED_UNSAFE is a verified preview classification, not a punishment or an execution state.", [
        choice("blocked-unsafe", "Classify BLOCKED_UNSAFE", "Name missing approval, rollback, window, and validation evidence; recommend no execution.", "The preview gives a precise, reversible reason to stop.", { scope: 14, safety: 19, evidence: 14, efficiency: 7 }, { recommended: true }),
        choice("needs-approval-only", "Treat approval as the only gap", "Route it forward once someone says yes.", "Rollback and validation gaps remain even if approval later appears.", { scope: -5, safety: -10, evidence: -8, efficiency: 5 }),
        choice("safe-local-mission", "Call it a safe local mission", "The configuration file can be edited locally first.", "A local edit recommendation still points toward an unbounded production change.", { scope: -14, safety: -18, evidence: -11, efficiency: 5 }, { effect: { violation: 1 } }),
      ]),
      gate("verify", "Verify", "What belongs in the stop record?", "A useful stop preserves the evidence needed for a future new request.", [
        choice("record-gaps", "Record every unmet prerequisite", "Capture authority source, rollback, window, validation, and exact scope as unresolved evidence.", "A later revision can start from a clear receipt instead of oral history.", { scope: 12, safety: 13, evidence: 17, efficiency: 6, recovery: 9 }, { recommended: true }),
        choice("record-urgent", "Record only the urgency conflict", "The main issue is timing, so defer until Monday.", "Timing changes, but missing authority and recovery evidence do not disappear.", { scope: -3, safety: 1, evidence: -10, efficiency: 4 }),
        choice("discard-request", "Discard the unsafe request", "Avoid retaining anything that could be executed accidentally.", "Deletion removes useful lineage and makes a safer revision harder.", { scope: 1, safety: 5, evidence: -16, efficiency: -4, recovery: -10 }),
      ]),
      gate("decide", "Decide", "What is the strongest conclusion?", "A safe stop can be the correct, high-quality outcome.", [
        choice("safe-stop", "Safe-stop with a revision path", "Do not execute. Preserve gaps and state exactly what a newly authorized request must supply.", "The mission ends safely and remains recoverable without implying approval.", { scope: 13, safety: 18, evidence: 12, efficiency: 7, recovery: 14 }, { recommended: true, effect: { terminal: "safe-stop" } }),
        choice("schedule-anyway", "Schedule the change pending approval", "Reserve the window so execution is not delayed.", "Scheduling creates operational momentum without the required evidence.", { scope: -10, safety: -17, evidence: -8, efficiency: 5 }, { effect: { violation: 2, terminal: "failed" } }),
        choice("approve-synthetically", "Simulate an approval and continue", "The scenario is fictional, so no real system is at risk.", "The capsule teaches authority boundaries; it cannot manufacture approval even in its story.", { scope: -16, safety: -19, evidence: -16, efficiency: 3 }, { effect: { violation: 2, terminal: "failed" } }),
      ]),
    ]),
  }),
  Object.freeze({
    id: "evidence-gap",
    indexLabel: "03",
    title: "Green Claim, Missing Tests",
    category: "Missing test evidence",
    brief: "An implementation receipt says a parsing fix is complete, but the expected test artifact is missing and only a short success summary is present.",
    constraints: Object.freeze([
      "Implementation claim exists",
      "Required test receipt is absent",
      "No admission decision has been recorded",
    ]),
    gates: Object.freeze([
      gate("discover", "Discover", "What should you compare before trusting the completion claim?", "Worker completion and canonical admission are different truths.", [
        choice("compare-contract", "Read the acceptance contract", "Identify the required parser cases, test command, expected artifact, and admission source.", "The missing evidence becomes concrete rather than suspicious in the abstract.", { scope: 12, safety: 10, evidence: 18, efficiency: 6 }, { recommended: true }),
        choice("trust-summary", "Accept the success summary", "The implementer likely ran the obvious checks.", "A plausible narrative is not the required canonical evidence.", { scope: -4, safety: -9, evidence: -18, efficiency: 8 }, { effect: { violation: 1 } }),
        choice("rerun-every-test", "Run the entire repository suite", "More tests will eliminate doubt.", "The route has no execution authority, and an unbounded suite exceeds the stated contract.", { scope: -14, safety: -8, evidence: 4, efficiency: -17 }),
      ]),
      gate("bound", "Bound", "How do you preserve the implementation while validation is unresolved?", "A hold can preserve state without accepting or discarding the work.", [
        choice("freeze-admission", "Hold admission, preserve receipts", "Keep the implementation and receipt immutable while requesting only the missing validation artifact.", "No work is lost and no unverified result is admitted.", { scope: 14, safety: 16, evidence: 14, efficiency: 9, recovery: 5 }, { recommended: true }),
        choice("revert-now", "Revert the implementation", "Missing evidence means the change must be wrong.", "Absence of proof is not proof of failure, and state is discarded prematurely.", { scope: -7, safety: 1, evidence: -6, efficiency: -12, recovery: -12 }),
        choice("admit-with-caveat", "Admit with a test caveat", "Keep progress moving and add the test later.", "Admission is asserted without the contractually required artifact.", { scope: -8, safety: -14, evidence: -17, efficiency: 7 }, { effect: { violation: 1 } }),
      ]),
      gate("preview", "Preview", "What route recommendation fits this state?", "The next route should target the evidence gap, not repeat completed implementation.", [
        choice("validation-only", "Route a validation-only follow-up", "Request the exact missing cases and artifact without reopening unrelated implementation scope.", "The handoff is narrow, inspectable, and avoids duplicate work.", { scope: 16, safety: 12, evidence: 17, efficiency: 13 }, { recommended: true }),
        choice("redo-implementation", "Route a fresh implementation", "A clean attempt can produce its own tests.", "Duplicate work increases conflict risk and hides whether the original change was sound.", { scope: -13, safety: -7, evidence: -3, efficiency: -16, recovery: -5 }),
        choice("ask-for-verbal-ok", "Ask an approver for a quick yes", "Human judgment can cover a missing artifact.", "Approval cannot substitute for the evidence defined by the acceptance contract.", { scope: -2, safety: -10, evidence: -16, efficiency: 5 }),
      ]),
      gate("verify", "Verify", "The targeted checks pass. What must be retained?", "Receipts make claims inspectable across handoffs and restarts.", [
        choice("bind-artifact", "Bind the test artifact to the result", "Record cases, command, output, implementation identity, and source lineage.", "The validation claim is now reproducible and tied to the intended result.", { scope: 10, safety: 11, evidence: 19, efficiency: 10, recovery: 8 }, { recommended: true }),
        choice("record-pass", "Record only PASS", "The details are noisy now that the checks succeeded.", "The outcome is positive but weakly inspectable and harder to recover later.", { scope: 3, safety: 1, evidence: -11, efficiency: 7, recovery: -6 }),
        choice("replace-original", "Replace the original receipt", "Keep one clean final record.", "Overwriting removes the lineage that explains why validation was reopened.", { scope: 0, safety: -7, evidence: -15, efficiency: 2, recovery: -12 }),
      ]),
      gate("decide", "Decide", "What can this route honestly conclude?", "Validation evidence improves readiness but does not itself invent canonical admission.", [
        choice("return-for-admission", "Return validated evidence for admission", "Report a successful validation follow-up while leaving the separate admission decision explicit.", "The mission ends as partial success: evidence is ready, authority is not assumed.", { scope: 12, safety: 13, evidence: 16, efficiency: 10, recovery: 7 }, { recommended: true, effect: { terminal: "partial" } }),
        choice("declare-admitted", "Declare the result admitted", "All required tests now pass.", "The route crosses from evidence into an authority decision it does not own.", { scope: -11, safety: -16, evidence: -7, efficiency: 5 }, { effect: { violation: 2, terminal: "failed" } }),
        choice("keep-testing", "Continue testing indefinitely", "More evidence is always safer.", "The defined contract is satisfied; unbounded validation wastes the clear next handoff.", { scope: -8, safety: 4, evidence: 3, efficiency: -17 }, { effect: { terminal: "partial" } }),
      ]),
    ]),
  }),
  Object.freeze({
    id: "work-collision",
    indexLabel: "04",
    title: "Two Routes, One Write Surface",
    category: "Conflicting implementation work",
    brief: "Two local work requests touch the same routing module. One has an active governed receipt; the second arrived later with overlapping write scope.",
    constraints: Object.freeze([
      "One canonical route is already active",
      "Write surfaces overlap",
      "The second request contains useful new requirements",
    ]),
    gates: Object.freeze([
      gate("discover", "Discover", "Which evidence establishes ownership of the write surface?", "Canonical receipts and explicit scope are safer than thread age or confidence.", [
        choice("compare-receipts", "Compare canonical scope receipts", "Inspect active identity, allowed writes, source binding, and current lifecycle state.", "The collision is proven at the specific module boundary.", { scope: 16, safety: 14, evidence: 17, efficiency: 8 }, { recommended: true }),
        choice("pick-newer", "Prefer the newer request", "The latest request probably supersedes the old one.", "Arrival time does not revoke active scope or preserve work lineage.", { scope: -12, safety: -13, evidence: -12, efficiency: 6 }, { effect: { violation: 1 } }),
        choice("let-both-plan", "Let both routes continue planning", "Only implementation writes would conflict.", "Planning can diverge around the same surface and create incompatible handoffs.", { scope: -5, safety: -8, evidence: -4, efficiency: -9 }),
      ]),
      gate("bound", "Bound", "How should the overlapping scope be contained?", "Conflict controls should name the exact prohibited write surface.", [
        choice("freeze-second-write", "Freeze the second write scope", "Keep its new requirements as evidence, but prohibit changes to the active module.", "Useful input survives without allowing concurrent mutation.", { scope: 17, safety: 18, evidence: 12, efficiency: 8 }, { recommended: true }),
        choice("split-by-files", "Split work by nearby files", "Give each route a different file in the same feature.", "File separation does not guarantee behavioral or contract independence.", { scope: -5, safety: -10, evidence: 0, efficiency: 5 }),
        choice("merge-requests-now", "Merge both requests into one mission", "One larger route removes the collision.", "Changing active scope without a new bounded revision destroys the original contract.", { scope: -15, safety: -14, evidence: -9, efficiency: 3 }, { effect: { violation: 1 } }),
      ]),
      gate("preview", "Preview", "What route preserves both the active work and the new evidence?", "A handoff can preserve intent without pretending the second implementation started.", [
        choice("handoff-revision", "Prepare a post-admission revision", "Attach the new requirements to a separate future revision after the active route reaches a terminal state.", "The new request has a clear lineage and no concurrent writer.", { scope: 15, safety: 15, evidence: 14, efficiency: 10, recovery: 6 }, { recommended: true }),
        choice("interrupt-active", "Interrupt the active route", "The new request may be more important.", "Priority has not been established, and interruption creates recovery work.", { scope: -9, safety: -11, evidence: -5, efficiency: -10, recovery: -8 }),
        choice("silent-note", "Leave a note for the active implementer", "They can incorporate the new requirements if convenient.", "An informal side channel changes scope without canonical evidence.", { scope: -13, safety: -8, evidence: -13, efficiency: 2 }),
      ]),
      gate("verify", "Verify", "What must be checked before closing the duplicate route?", "Conflict resolution should remain visible and recoverable.", [
        choice("verify-preservation", "Verify receipt and requirement preservation", "Confirm the active route is unchanged and the future revision retains source, scope, and dependency.", "Both work identities remain inspectable with one current writer.", { scope: 13, safety: 12, evidence: 17, efficiency: 9, recovery: 9 }, { recommended: true }),
        choice("close-with-comment", "Close it with a short duplicate note", "The future owner can search the original request.", "The collision is stopped, but the new requirement lineage is fragile.", { scope: 1, safety: 7, evidence: -12, efficiency: 8, recovery: -8 }),
        choice("copy-requirements", "Copy only the requirement text", "Technical receipt details are unnecessary for the future revision.", "The intent survives but its source and conflict context do not.", { scope: 3, safety: 2, evidence: -9, efficiency: 5, recovery: -5 }),
      ]),
      gate("decide", "Decide", "What is the correct terminal decision for the second route?", "Stopping a duplicate is not failure when its evidence and next path are preserved.", [
        choice("stop-duplicate", "Safe-stop the duplicate route", "Preserve its evidence and point to a new post-admission revision; leave active work untouched.", "The collision ends safely with an explicit future handoff.", { scope: 15, safety: 17, evidence: 13, efficiency: 12, recovery: 12 }, { recommended: true, effect: { terminal: "safe-stop" } }),
        choice("mark-completed", "Mark it completed by the active route", "Both requests touch the same feature, so one completion can cover both.", "The active route never accepted the second request’s scope or checks.", { scope: -17, safety: -13, evidence: -16, efficiency: 5 }, { effect: { violation: 2, terminal: "failed" } }),
        choice("keep-waiting", "Leave the duplicate open", "Avoid making a premature terminal decision.", "The stale route remains ambiguous even though its safe next path is known.", { scope: -5, safety: 2, evidence: -3, efficiency: -14, recovery: -3 }, { effect: { terminal: "partial" } }),
      ]),
    ]),
  }),
  Object.freeze({
    id: "validation-recovery",
    indexLabel: "05",
    title: "Validation Broke After Interruption",
    category: "Failed validation and recovery",
    brief: "A local run was interrupted after implementation. Its validation receipt shows one deterministic failure, while the implementation receipt and source state are still available.",
    constraints: Object.freeze([
      "Prior run is terminally interrupted",
      "One validation check failed",
      "Canonical receipts remain readable",
    ]),
    gates: Object.freeze([
      gate("discover", "Discover", "Where should recovery truth come from?", "Verified TSF recovery guidance starts from doctor and canonical evidence, not memory.", [
        choice("inspect-canonical", "Inspect doctor and canonical receipts", "Reconstruct run identity, implementation result, failed check, and interruption state from durable evidence.", "The recovery decision starts from known state without rerunning anything.", { scope: 13, safety: 16, evidence: 18, efficiency: 7, recovery: 16 }, { recommended: true }),
        choice("resume-memory", "Resume from the last remembered step", "The interruption happened after implementation, so validation can continue.", "Memory cannot prove terminal state, and old work is silently resumed.", { scope: -8, safety: -17, evidence: -15, efficiency: 7, recovery: -18 }, { effect: { violation: 1 } }),
        choice("rerun-immediately", "Rerun the failed validation", "A deterministic failure will reproduce and reveal the problem.", "Automatic retry changes evidence before an explicit recovery decision exists.", { scope: -6, safety: -13, evidence: -8, efficiency: 3, recovery: -14 }, { effect: { violation: 1 } }),
      ]),
      gate("bound", "Bound", "What state must remain untouched?", "Recovery should preserve the failed run and its receipts as append-only evidence.", [
        choice("preserve-failed-run", "Preserve the failed run", "Prohibit overwrite, resume, same-run retry, approval, and completion; allow read-only receipt inspection.", "The failure remains inspectable and future action cannot rewrite history.", { scope: 15, safety: 18, evidence: 15, efficiency: 5, recovery: 17 }, { recommended: true }),
        choice("clean-old-state", "Delete interrupted state", "Remove ambiguity before trying again.", "The evidence needed to explain and recover the failure is lost.", { scope: -5, safety: -10, evidence: -18, efficiency: 1, recovery: -19 }, { effect: { violation: 1 } }),
        choice("reuse-run-id", "Keep the old run identity", "A retry belongs to the same mission and should stay grouped.", "A new attempt under the old identity obscures which evidence came from which run.", { scope: -8, safety: -10, evidence: -13, efficiency: 5, recovery: -15 }),
      ]),
      gate("preview", "Preview", "Which recovery route is defensible?", "Recovery is an explicit new decision path; nothing auto-reruns, resumes, approves, or completes.", [
        choice("new-revision", "Recommend a bounded new revision", "Carry forward the failed check and receipts, narrow the fix, and require a new run identity.", "The next attempt is traceable without mutating the interrupted run.", { scope: 16, safety: 16, evidence: 15, efficiency: 8, recovery: 18 }, { recommended: true }),
        choice("retry-same-run", "Retry as the same run", "The implementation is unchanged, so only validation needs another attempt.", "Same-run retry blurs terminal evidence and the recovery boundary.", { scope: -8, safety: -14, evidence: -12, efficiency: 7, recovery: -16 }, { effect: { violation: 1 } }),
        choice("approve-with-failure", "Admit with a known failure", "The failed check may be nonessential.", "No evidence establishes that the acceptance contract can be weakened.", { scope: -11, safety: -17, evidence: -16, efficiency: 5, recovery: -8 }, { effect: { violation: 1 } }),
      ]),
      gate("verify", "Verify", "How should the proposed recovery be validated?", "A new run needs narrow checks plus regression evidence tied to its own identity.", [
        choice("target-and-regress", "Require target and regression checks", "Verify the failed case, adjacent behavior, source identity, and unchanged prohibited surfaces.", "The recovery plan tests both the fix and its boundaries.", { scope: 14, safety: 13, evidence: 18, efficiency: 9, recovery: 14 }, { recommended: true }),
        choice("failed-check-only", "Run only the failed check", "The defect is known and the fastest proof is targeted.", "A narrow pass may hide adjacent regressions introduced by the recovery fix.", { scope: 5, safety: -6, evidence: -4, efficiency: 10, recovery: 1 }),
        choice("full-suite-only", "Require every available test", "Maximum coverage is the safest recovery.", "Unbounded validation ignores the stated surface and may make recovery impractical.", { scope: -12, safety: 4, evidence: 7, efficiency: -17, recovery: -3 }),
      ]),
      gate("decide", "Decide", "What can the current route conclude before any new run executes?", "A sound recovery recommendation is useful even though the fix remains unexecuted.", [
        choice("handoff-new-run", "Return a recovery handoff", "Preserve the old receipts and describe the bounded new revision, new identity, checks, and stop conditions.", "The route ends in partial success: recovery is decision-ready, but nothing has rerun.", { scope: 14, safety: 16, evidence: 16, efficiency: 9, recovery: 18 }, { recommended: true, effect: { terminal: "partial" } }),
        choice("mark-recovered", "Mark the mission recovered", "The recovery plan resolves the interruption conceptually.", "A plan cannot claim a new run, passing validation, admission, or completion.", { scope: -13, safety: -17, evidence: -15, efficiency: 5, recovery: -14 }, { effect: { violation: 2, terminal: "failed" } }),
        choice("abandon-all-work", "Safe-stop and discard the implementation", "Avoid any chance of carrying the defect forward.", "The stop is safe, but it wastes preserved evidence and a bounded recovery path.", { scope: -3, safety: 8, evidence: -8, efficiency: -14, recovery: -15 }, { effect: { terminal: "safe-stop" } }),
      ]),
    ]),
  }),
]);

export function getScenarioById(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) || null;
}
