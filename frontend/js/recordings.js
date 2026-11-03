function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export async function loadRecordings(apiRequest, escapeHtml) {
  const container = document.querySelector("#class-recordings");
  if (!container) return;
  container.innerHTML = `<p class="faculty-section-note">Loading recordings…</p>`;
  try {
    const { recordings } = await apiRequest("/api/recordings");
    container.innerHTML = recordings.length
      ? `<div class="recording-grid">${recordings.map((recording) => {
        const url = `/api/recordings/${encodeURIComponent(recording.id)}/file`;
        return `<article class="recording-card">
          <video controls preload="metadata" src="${url}?download=0" aria-label="Play ${escapeHtml(recording.title)}"></video>
          <div class="recording-card-details">
            <strong>${escapeHtml(recording.title)}</strong>
            <span>${escapeHtml(recording.instructorName)} · ${new Date(recording.createdAt).toLocaleString()}</span>
            <span>${formatDuration(recording.durationSeconds)} · ${formatSize(recording.sizeBytes)}</span>
            <a class="button button-quiet" href="${url}">Download for offline viewing</a>
          </div>
        </article>`;
      }).join("")}</div>`
      : `<p class="faculty-section-note">No class recordings are available yet.</p>`;
  } catch (error) {
    container.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`;
  }
}
