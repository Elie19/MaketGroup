// assets/js/app.js

// [FIX] BASE_URL lu depuis le meta tag injecte par PHP (plus d'URL hardcodee)
const BASE_URL  = document.querySelector('meta[name="base-url"]')?.content  ?? '';
// [FIX] Token CSRF lu depuis le meta tag pour les requetes AJAX
const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

// Helper : fetch avec CSRF header automatique
async function apiFetch(url, options = {}) {
    return fetch(BASE_URL + url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': CSRF_TOKEN,
            ...(options.headers ?? {}),
        },
    });
}

// -- Theme ------------------------------------------------------------------
const root  = document.getElementById('html-root') || document.documentElement;
const saved = localStorage.getItem('theme') || 'light';
root.setAttribute('data-theme', saved);

function toggleTheme() {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

// -- Mobile nav -------------------------------------------------------------
function toggleMenu() {
    document.querySelector('.nav-links')?.classList.toggle('open');
}

// -- Gallery ----------------------------------------------------------------
document.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
        const src  = thumb.querySelector('img')?.src;
        const main = document.getElementById('gallery-main');
        if (src && main) main.src = src;
        document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
    });
});

// -- Favorites toggle -------------------------------------------------------
document.querySelectorAll('.ad-fav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const adId = btn.dataset.adId;
        if (!adId) return;

        // [FIX] URL dynamique + CSRF header via apiFetch
        const res = await apiFetch('/api/toggle-favorite.php', {
            method: 'POST',
            body: JSON.stringify({ ad_id: adId }),
        });

        if (res.status === 401) { location.href = BASE_URL + '/login.php'; return; }
        const json = await res.json();
        btn.classList.toggle('active', !!json.favorited);
    });
});

// -- Category filter --------------------------------------------------------
document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const url = new URL(window.location.href);
        const cat = btn.dataset.cat;
        if (cat === 'Tous') url.searchParams.delete('category');
        else url.searchParams.set('category', cat);
        window.location.href = url.toString();
    });
});

// -- Chat polling -----------------------------------------------------------
let lastMsgId = 0;

function initChat(chatId, isGroup) {
    loadMessages(chatId, isGroup);
    setInterval(() => loadMessages(chatId, isGroup), 3000);
}

async function loadMessages(chatId, isGroup) {
    // [FIX] URL dynamique via BASE_URL
    const param = isGroup ? 'group_id' : 'chat_id';
    const res   = await fetch(`${BASE_URL}/api/messages.php?${param}=${chatId}&after=${lastMsgId}`);
    if (!res.ok) return;
    const msgs = await res.json();
    if (!msgs.length) return;

    const container = document.getElementById('chat-messages');
    msgs.forEach(m => {
        lastMsgId = Math.max(lastMsgId, m.id);
        const div = document.createElement('div');
        div.className = 'msg ' + (m.is_mine ? 'mine' : 'theirs');
        div.innerHTML = `<div>${escHtml(m.text_content)}</div><div class="msg-meta">${escHtml(m.sender_name)} · ${escHtml(m.time_ago)}</div>`;
        container?.appendChild(div);
    });
    if (container) container.scrollTop = container.scrollHeight;
}

async function sendMessage(chatId, isGroup) {
    const input = document.getElementById('msg-input');
    const text  = input?.value.trim();
    if (!text) return;

    // [FIX] Limiter a 2000 char cote client aussi
    if (text.length > 2000) {
        alert('Message trop long (max 2000 caracteres).');
        return;
    }

    input.value = '';
    const body  = isGroup ? { group_id: chatId, text } : { chat_id: chatId, text };

    // [FIX] URL dynamique + CSRF header via apiFetch
    await apiFetch('/api/send-message.php', {
        method: 'POST',
        body: JSON.stringify(body),
    });
    loadMessages(chatId, isGroup);
}

// -- Utils ------------------------------------------------------------------
function escHtml(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// -- Image preview ----------------------------------------------------------
document.querySelectorAll('input[type=file]').forEach(inp => {
    inp.addEventListener('change', () => {
        const preview = document.getElementById('img-preview');
        if (!preview) return;
        preview.innerHTML = '';
        Array.from(inp.files).slice(0, 5).forEach(file => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:.5rem;';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });
});
