'use strict';

/**
 * Normalize pagination input and derive SQL LIMIT/OFFSET values.
 * Limits are coerced to safe integers because mysql2 `execute()` cannot bind
 * placeholders inside LIMIT/OFFSET clauses.
 */
function resolvePagination({ page = 1, perPage = 15 } = {}, maxPerPage = 100) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePerPage = Math.min(maxPerPage, Math.max(1, parseInt(perPage, 10) || 15));
  const offset = (safePage - 1) * safePerPage;

  return { page: safePage, perPage: safePerPage, offset, limit: safePerPage };
}

/**
 * Build the standard paginated payload consumed by the views.
 */
function paginated(rows, total, { page, perPage }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return {
    rows,
    total,
    page,
    perPage,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

module.exports = { resolvePagination, paginated };
