'use strict';

(function () {
  // -------------------------------------------------------------------------
  // Sidebar drawer (off-canvas on small screens)
  // -------------------------------------------------------------------------
  const sidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('appSidebarBackdrop');
  const sidebarToggle = document.getElementById('appSidebarToggle');

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('show');
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (sidebarBackdrop) sidebarBackdrop.classList.toggle('show');
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeSidebar);
  }

  if (sidebar) {
    sidebar.querySelectorAll('.app-sidebar-nav .nav-link').forEach((link) => {
      link.addEventListener('click', closeSidebar);
    });
  }

  // -------------------------------------------------------------------------
  // Confirm destructive actions declared with data-confirm
  // -------------------------------------------------------------------------
  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!window.confirm(form.dataset.confirm)) {
        event.preventDefault();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Auto-dismiss flash alerts
  // -------------------------------------------------------------------------
  document.querySelectorAll('.alert-dismissible').forEach((alert) => {
    window.setTimeout(() => {
      if (window.bootstrap && window.bootstrap.Alert) {
        window.bootstrap.Alert.getOrCreateInstance(alert).close();
      }
    }, 6000);
  });

  // -------------------------------------------------------------------------
  // Generate a random secret key
  // -------------------------------------------------------------------------
  document.querySelectorAll('[data-generate-secret]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.querySelector(button.dataset.generateSecret);
      if (!target) return;
      const bytes = new Uint8Array(32);
      window.crypto.getRandomValues(bytes);
      target.value = Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    });
  });

  // -------------------------------------------------------------------------
  // Copy-to-clipboard buttons (documentation code blocks)
  // -------------------------------------------------------------------------
  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copy);
      if (!target) return;

      const text = target.textContent;
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      const original = button.innerHTML;
      button.innerHTML = '<i class="bi bi-check2"></i>';
      button.classList.add('copied');
      window.setTimeout(() => {
        button.innerHTML = original;
        button.classList.remove('copied');
      }, 1500);
    });
  });

  // -------------------------------------------------------------------------
  // Response body modal
  // -------------------------------------------------------------------------
  const responseModalEl = document.getElementById('responseModal');
  if (responseModalEl && window.bootstrap) {
    const modal = new window.bootstrap.Modal(responseModalEl);
    const appEl = document.getElementById('response-modal-app');
    const httpEl = document.getElementById('response-modal-http');
    const bodyEl = document.getElementById('response-modal-body');

    document.querySelectorAll('[data-response-view]').forEach((button) => {
      button.addEventListener('click', () => {
        appEl.textContent = button.dataset.app || '';
        httpEl.textContent = button.dataset.http || '';
        bodyEl.textContent = button.dataset.response || '(kosong)';
        modal.show();
      });
    });
  }

  // -------------------------------------------------------------------------
  // Realtime attendance feed + socket status
  // -------------------------------------------------------------------------
  const statusEl = document.getElementById('socket-status');
  const feed = document.getElementById('attendance-feed');

  const BADGE_CLASS = {
    SUCCESS: 'text-bg-success',
    FAILED: 'text-bg-danger',
    PENDING: 'text-bg-warning',
    PARTIAL: 'text-bg-info',
  };

  function setSocketStatus(connected) {
    if (!statusEl) return;
    statusEl.textContent = connected ? 'live' : 'offline';
    const badge = statusEl.closest('.badge');
    if (badge) {
      badge.classList.toggle('text-bg-secondary', !connected);
      badge.classList.toggle('text-bg-success', connected);
    }
  }

  if (typeof window.io === 'function') {
    const socket = window.io();

    socket.on('connect', () => setSocketStatus(true));
    socket.on('disconnect', () => setSocketStatus(false));

    if (feed) {
      socket.on('new-attendance', (log) => {
        const empty = document.getElementById('feed-empty');
        if (empty) empty.remove();

        const row = document.createElement('tr');
        row.dataset.logId = log.id;
        row.className = 'flash-new';

        const idCell = document.createElement('td');
        const link = document.createElement('a');
        link.href = `/admin/attendance-logs/${encodeURIComponent(log.id)}`;
        link.textContent = `#${log.id}`;
        idCell.appendChild(link);

        const snCell = document.createElement('td');
        const snCode = document.createElement('code');
        snCode.textContent = log.device_sn || '-';
        snCell.appendChild(snCode);

        const userCell = document.createElement('td');
        userCell.textContent = log.user_id_finger || '-';

        const timeCell = document.createElement('td');
        timeCell.className = 'small';
        timeCell.textContent = log.timestamp || '-';

        const statusCell = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `badge ${BADGE_CLASS[log.forward_status] || 'text-bg-secondary'}`;
        badge.textContent = log.forward_status || 'PENDING';
        statusCell.appendChild(badge);

        row.append(idCell, snCell, userCell, timeCell, statusCell);
        feed.prepend(row);

        while (feed.children.length > 15) {
          feed.removeChild(feed.lastElementChild);
        }

        window.setTimeout(() => row.classList.remove('flash-new'), 1500);
      });

      socket.on('attendance-updated', (payload) => {
        const row = feed.querySelector(`tr[data-log-id="${payload.id}"]`);
        if (!row) return;
        const badge = row.querySelector('.badge');
        if (badge) {
          // Status refresh happens on next page load; just nudge the row.
          row.classList.add('flash-new');
          window.setTimeout(() => row.classList.remove('flash-new'), 1200);
        }
      });
    }
  } else {
    setSocketStatus(false);
  }
})();
