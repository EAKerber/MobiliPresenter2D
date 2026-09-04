# Candidate inbox

Create one subdirectory per candidate role or experiment. Keep the PNG and its `*.json` metadata together conceptually, and point `imagePath` at the repository-relative PNG path.

Example metadata:

```json
{
  "schemaVersion": "CandidateAsset 0.1",
  "id": "range-freestanding-candidate-001",
  "role": "range-freestanding",
  "targetScene": "cozinha-01",
  "targetVariant": "module-02-hidden",
  "imagePath": "review-assets/candidates/range-freestanding/candidate-001.png",
  "status": "REVIEW",
  "provenance": {
    "method": "image-generation",
    "sourceReferences": ["canonical-master", "module-02-hidden"],
    "notes": "Generated offline against fixed scene references."
  },
  "humanReview": {
    "status": "PENDING",
    "reviewer": null,
    "reviewedAt": null,
    "checklist": {}
  }
}
```
