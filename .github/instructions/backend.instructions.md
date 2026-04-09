---
applyTo: "backend/**/*,*.py"
---

## Backend Guidelines

- All API endpoints must be defined in the `routers` folder.
- Load example database content from the `database.py` file.
- Log errors and internal details on the server. API responses may return appropriate HTTP status codes and safe, user-facing error messages, but must not expose sensitive/internal details such as stack traces or raw exception data.
- Ensure all APIs are explained in the documentation.
- Verify changes in the backend are reflected in the frontend (`src/static/**`). If possible breaking changes are found, mention them to the developer.