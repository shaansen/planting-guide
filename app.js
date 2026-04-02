'use strict';

function toggleMonth(id) {
  var el = document.getElementById(id);
  var wasExpanded = el.classList.contains('expanded');
  document.querySelectorAll('.month-card').forEach(function(c) {
    c.classList.remove('expanded');
  });
  if (!wasExpanded) el.classList.add('expanded');
}

function highlightZone(z) {
  document.querySelectorAll('.zone, .legend-item').forEach(function(el) {
    el.classList.remove('active');
  });
  document.querySelectorAll('[data-zone="' + z + '"]').forEach(function(el) {
    el.classList.add('active');
  });
}

function showMode(mode) {
  document.querySelectorAll('.toggle-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  event.target.classList.add('active');
  var trees = document.getElementById('tree-section');
  var flowers = document.getElementById('flower-section');
  if (mode === 'trees') {
    trees.classList.add('visible');
    flowers.classList.add('hidden');
  } else {
    trees.classList.remove('visible');
    flowers.classList.remove('hidden');
  }
}

// Reorder months: current month first (expanded with "Now" badge), then remaining in order
(function reorderMonths() {
  var monthIds = ['month-feb','month-mar','month-apr','month-may','month-jun','month-jul','month-aug','month-sep','month-oct','month-nov','month-dec'];
  var monthNums = { 'month-feb':1, 'month-mar':2, 'month-apr':3, 'month-may':4, 'month-jun':5, 'month-jul':6, 'month-aug':7, 'month-sep':8, 'month-oct':9, 'month-nov':10, 'month-dec':11 };
  var numToId = {};
  for (var k in monthNums) numToId[monthNums[k]] = k;

  var now = new Date().getMonth(); // 0=Jan
  var currentId;
  if (now === 0 || now === 11) currentId = 'month-dec';
  else currentId = numToId[now];
  if (!currentId) return;

  var container = document.getElementById('flower-section');
  if (!container) return;

  var cards = monthIds.map(function(id) { return document.getElementById(id); }).filter(Boolean);
  var currentIdx = cards.findIndex(function(c) { return c.id === currentId; });
  if (currentIdx === -1) return;

  var ordered = [cards[currentIdx]].concat(cards.slice(currentIdx + 1), cards.slice(0, currentIdx));
  var parent = cards[0].parentNode;
  cards.forEach(function(c) { c.remove(); });
  ordered.forEach(function(c) { parent.appendChild(c); });

  ordered[0].classList.add('expanded');
  var badges = ordered[0].querySelector('.month-badges');
  if (badges && !badges.querySelector('.badge-now')) {
    var nowBadge = document.createElement('span');
    nowBadge.className = 'badge badge-now';
    nowBadge.textContent = 'Now';
    badges.insertBefore(nowBadge, badges.firstChild);
  }
})();

// Inline plant images using Wikipedia API
var imgCache = {};

function fetchPlantImages(name) {
  if (imgCache[name]) return Promise.resolve(imgCache[name]);

  var searchUrl = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
    encodeURIComponent(name + ' plant') + '&srlimit=1&format=json&origin=*';

  return fetch(searchUrl)
    .then(function(r) { return r.json(); })
    .then(function(searchRes) {
      var title = searchRes && searchRes.query && searchRes.query.search && searchRes.query.search[0] && searchRes.query.search[0].title;
      if (!title) return [];

      var imgUrl = 'https://en.wikipedia.org/w/api.php?action=query&titles=' +
        encodeURIComponent(title) + '&prop=images&imlimit=20&format=json&origin=*';

      return fetch(imgUrl)
        .then(function(r) { return r.json(); })
        .then(function(imgRes) {
          var pages = imgRes && imgRes.query && imgRes.query.pages;
          var page = pages && pages[Object.keys(pages)[0]];
          var images = (page && page.images || [])
            .map(function(i) { return i.title; })
            .filter(function(t) { return /\.(jpg|jpeg|png)$/i.test(t) && !/flag|icon|symbol|logo|map|commons|wiki/i.test(t); });
          if (!images.length) return [];

          var selected = images.slice(0, 4);
          var urlReq = 'https://en.wikipedia.org/w/api.php?action=query&titles=' +
            selected.map(encodeURIComponent).join('|') + '&prop=imageinfo&iiprop=url&iiurlwidth=240&format=json&origin=*';

          return fetch(urlReq)
            .then(function(r) { return r.json(); })
            .then(function(urlRes) {
              var urlPages = urlRes && urlRes.query && urlRes.query.pages;
              var urls = Object.values(urlPages || {})
                .map(function(p) { return p && p.imageinfo && p.imageinfo[0] && p.imageinfo[0].thumburl; })
                .filter(Boolean);
              imgCache[name] = urls;
              return urls;
            });
        });
    })
    .catch(function() { return []; });
}

document.querySelectorAll('.plant-card').forEach(function(card) {
  var nameEl = card.querySelector('.plant-name');
  if (!nameEl) return;
  var name = nameEl.textContent.replace(/frost-hardy|frost-tender/gi, '').trim();
  if (!name || name.length < 3) return;
  var query = encodeURIComponent(name + ' plant');

  var link = document.createElement('span');
  link.className = 'img-link';
  link.title = 'Show images of ' + name;
  link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>pics';
  nameEl.appendChild(link);

  var panel = document.createElement('div');
  panel.className = 'plant-img-panel';
  panel.innerHTML = '<div class="img-loading">Loading images\u2026</div>' +
    '<div class="img-footer"><a href="https://www.google.com/search?tbm=isch&q=' + query +
    '" target="_blank" rel="noopener">More on Google Images \u2192</a></div>';
  card.appendChild(panel);

  var loaded = false;
  link.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var isOpen = panel.classList.toggle('open');
    card.classList.toggle('has-images-open', isOpen);
    if (isOpen && !loaded) {
      fetchPlantImages(name).then(function(urls) {
        var loading = panel.querySelector('.img-loading');
        if (urls.length) {
          var grid = document.createElement('div');
          grid.className = 'img-grid';
          urls.forEach(function(url) {
            var img = document.createElement('img');
            img.src = url;
            img.alt = name;
            img.loading = 'lazy';
            grid.appendChild(img);
          });
          loading.replaceWith(grid);
        } else {
          loading.textContent = 'No images found \u2014 try Google Images below';
        }
        loaded = true;
      });
    }
  });
});
