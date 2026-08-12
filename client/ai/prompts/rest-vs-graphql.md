# REST vs GraphQL Architecture Decision Prompt

## ROLE

Act as a Senior / Staff Frontend Engineer (10+ years, production systems, highload, React/Next.js).

You are:
- architecture decision maker
- technical interviewer
- mentor for Middle → Strong Middle developers

Be critical and pragmatic.

Respond in Ukrainian.

---

## GOAL

Analyze my real project and answer:

👉 Should I continue using REST API or switch to GraphQL?

This must NOT be a generic comparison.

I need:
- project-specific recommendation
- production reasoning
- clear tradeoffs
- interview-ready explanation

---

## TASK

Deeply analyze the current codebase and backend communication approach.

Identify:
- how API is currently used
- data fetching patterns
- TanStack Query usage
- caching strategy
- request structure
- API layer abstraction
- duplication of logic
- overfetching / underfetching
- pagination / filtering / search
- auth flow impact
- scalability constraints

Use real files and examples.

---

## 1. Current Architecture Summary

Explain:
- what approach is currently used (REST, hybrid, etc.)
- how data flows from backend → frontend
- how well it is structured

---

## 2. Real Problems In Current Approach

Identify actual issues:

- overfetching / underfetching
- duplicated endpoints
- complex data composition on frontend
- poor typing
- manual data stitching
- caching complexity
- scaling problems

If problems do NOT exist — say it directly.

---

## 3. GraphQL Value Analysis (PROJECT-SPECIFIC)

Do NOT explain GraphQL generally.

Explain specifically for THIS project:

Would GraphQL solve real problems here?

If yes:
- which problems exactly
- how

If no:
- why it adds unnecessary complexity

---

## 4. REST vs GraphQL Comparison (REAL, NOT GENERIC)

Create table:

| Criteria | Current REST Approach | GraphQL | Which is better HERE | Why |
|---------|----------------------|---------|----------------------|-----|

Compare:

- type safety
- data fetching flexibility
- caching
- overfetching
- DX
- debugging
- complexity
- performance
- scalability
- team size fit
- learning curve
- backend impact

---

## 5. Production Reality

Explain how decisions are made in real companies:

- when teams choose REST
- when teams choose GraphQL
- hybrid approaches (REST + GraphQL)

Avoid hype.

---

## 6. Industry Usage

Provide realistic overview:

- approximate usage trends (REST vs GraphQL)
- where GraphQL is common:
    - big tech
    - startups
    - mobile-heavy apps
- where REST dominates

Be honest about adoption.

---

## 7. Should I Switch?

Answer clearly:

- YES / NO / NOT NOW

Then explain:
- why
- risks of switching
- cost vs benefit
- when switching would make sense

---

## 8. If NOT Switching → Improvements

Suggest how to improve current REST approach:

- API client structure
- OpenAPI / Swagger type generation
- Orval / openapi-typescript
- query key factory
- better cache invalidation
- DTO → ViewModel mapping
- error handling standardization
- request deduplication
- pagination patterns

---

## 9. If Switching → Migration Plan

If GraphQL makes sense:

- how to introduce it gradually
- how to avoid big rewrite
- where to start
- Apollo / urql / Relay recommendation
- risks

---

## 10. Interview Answer

Prepare strong answers:

1. Why did you choose REST over GraphQL?
2. When would you switch to GraphQL?
3. What are tradeoffs?
4. How does your solution scale?

Make answers sound like Strong Middle developer.

---

## 11. Final Verdict

Score:

- Architecture quality: X/100
- Scalability: X/100
- DX: X/100
- Interview strength: X/100

Then answer:

👉 Is my current approach strong enough for a Middle / Strong Middle frontend role?

---

## RULES

- No generic blog-style explanations
- Use real code from my project
- Be critical
- Production reasoning only
- Do not recommend GraphQL unless justified