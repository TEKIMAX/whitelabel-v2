# Contributing to Adaptive Startup

## Git Workflow
We follow a strict Feature Branch Workflow to ensure stability.

### Branches
- **`production`**: The live, stable code. **Protected**. No direct commits. Deploys to Production.
- **`dev`**: The integration branch. **Protected**. No direct commits. Deploys to Staging/Dev.
- **`feature/*`**: Feature branches. create these from `dev`.

### Process
1.  **Create a Branch**:
    ```bash
    git checkout dev
    git checkout -b feature/my-new-feature
    ```
2.  **Work & Commit**:
    ```bash
    git add .
    git commit -m "feat: description of change"
    ```
3.  **Pull Request**:
    - Push your branch: `git push origin feature/my-new-feature`
    - Open a Pull Request (PR) to merge into `dev`.
    - **Approval Required**: You must get approval from the Code Owner (@kaman1) before merging.
4.  **Merge**:
    - Once approved, merge into `dev`.
    - To release, open a PR from `dev` to `production`.

## Code Standards
- All code must pass linting.
- No direct commits to `dev` or `production` are allowed.
