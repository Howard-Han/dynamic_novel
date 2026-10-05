/* 韓哥的小說庫 — 首頁書架、訊息框、閱讀流程 */
(function () {
  'use strict';

  var OPTION_MARKS = ['Ａ', 'Ｂ', 'Ｃ', 'Ｄ', 'Ｅ'];

  var el = {
    home: document.getElementById('view-home'),
    reader: document.getElementById('view-reader'),
    tabs: document.getElementById('category-tabs'),
    shelf: document.getElementById('shelf'),
    backdrop: document.getElementById('modal-backdrop'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    modalIntro: document.getElementById('modal-intro'),
    modalEndings: document.getElementById('modal-endings'),
    btnToggle: document.getElementById('btn-toggle-endings'),
    btnStart: document.getElementById('btn-start'),
    btnBack: document.getElementById('btn-back'),
    readerTitle: document.getElementById('reader-novel-title'),
    readerBody: document.getElementById('reader-body'),
    curtain: document.getElementById('curtain'),
    curtainTitle: document.getElementById('curtain-title')
  };

  var novels = {};      // id -> 小說資料
  var byCategory = {};  // 類別 -> [小說]
  var modalNovelId = null;
  var engine = null;
  var currentNovel = null;

  /* ---------- 載入 ---------- */

  function loadNovelScripts(done) {
    var list = window.NOVEL_REGISTRY.novels;
    var remaining = list.length;
    if (!remaining) return done();

    list.forEach(function (entry) {
      var s = document.createElement('script');
      s.src = entry.dir + '/data.js';
      s.onload = s.onerror = function () {
        var data = window.NOVEL_DATA && window.NOVEL_DATA[entry.id];
        if (data) {
          data.dir = entry.dir;
          novels[entry.id] = data;
          (byCategory[data.category] = byCategory[data.category] || []).push(data);
        }
        if (--remaining === 0) done();
      };
      document.head.appendChild(s);
    });
  }

  /* ---------- 首頁 ---------- */

  function renderHome() {
    var categories = window.NOVEL_REGISTRY.categories.filter(function (c) {
      return byCategory[c] && byCategory[c].length;
    });

    el.tabs.innerHTML = '';
    categories.forEach(function (category, i) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'tab';
      tab.textContent = category;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(i === 0));
      tab.addEventListener('click', function () { selectCategory(category); });
      el.tabs.appendChild(tab);
    });

    if (categories.length) selectCategory(categories[0]);
  }

  function selectCategory(category) {
    Array.prototype.forEach.call(el.tabs.children, function (tab) {
      tab.setAttribute('aria-selected', String(tab.textContent === category));
    });
    renderShelf(byCategory[category] || []);
  }

  function renderShelf(list) {
    el.shelf.innerHTML = '';

    var books = document.createElement('div');
    books.className = 'books';
    list.forEach(function (novel) {
      var book = document.createElement('button');
      book.type = 'button';
      book.className = 'book';
      book.textContent = novel.title;
      book.addEventListener('click', function () { openModal(novel.id); });
      books.appendChild(book);
    });

    var plank = document.createElement('div');
    plank.className = 'plank';

    var hint = document.createElement('p');
    hint.className = 'shelf-hint';
    hint.textContent = '點擊書背，查看小說簡介';

    el.shelf.appendChild(books);
    el.shelf.appendChild(plank);
    el.shelf.appendChild(hint);
  }

  /* ---------- 訊息框 ---------- */

  function openModal(novelId) {
    var novel = novels[novelId];
    modalNovelId = novelId;

    el.modalTitle.textContent = novel.title;
    el.modalIntro.textContent = novel.intro;
    el.modalEndings.innerHTML = '';
    Object.keys(novel.endings).forEach(function (key) {
      var ending = novel.endings[key];
      var item = document.createElement('div');
      item.className = 'ending-item';
      item.textContent = ending.num + '　' + ending.title;
      el.modalEndings.appendChild(item);
    });

    el.modalEndings.hidden = true;
    el.btnToggle.textContent = '展示所有結局名稱';
    el.backdrop.hidden = false;
    el.btnStart.focus();
  }

  function closeModal() {
    el.backdrop.hidden = true;
    modalNovelId = null;
  }

  el.btnToggle.addEventListener('click', function () {
    var show = el.modalEndings.hidden;
    el.modalEndings.hidden = !show;
    el.btnToggle.textContent = show ? '隱藏所有結局名稱' : '展示所有結局名稱';
  });

  el.backdrop.addEventListener('click', function (e) {
    if (!el.modal.contains(e.target)) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.backdrop.hidden) closeModal();
  });

  el.btnStart.addEventListener('click', function () {
    var id = modalNovelId;
    closeModal();
    startReading(id);
  });

  /* ---------- 過場動畫 ---------- */

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function transition(title, render) {
    if (reduceMotion) {
      render();
      window.scrollTo(0, 0);
      return;
    }
    el.curtain.classList.add('is-active');
    setTimeout(function () {
      el.curtainTitle.textContent = title;
      el.curtainTitle.classList.add('is-visible');
    }, 400);
    setTimeout(function () {
      render();
      window.scrollTo(0, 0);
    }, 900);
    setTimeout(function () {
      el.curtainTitle.classList.remove('is-visible');
      el.curtain.classList.remove('is-active');
    }, 1150);
  }

  /* ---------- 閱讀 ---------- */

  function startReading(novelId) {
    currentNovel = novels[novelId];
    engine = Engine.create(currentNovel);
    var view = engine.start();

    el.readerTitle.textContent = currentNovel.title;
    transition(view.num + '　' + view.title, function () {
      el.home.hidden = true;
      el.reader.hidden = false;
      renderNode(view);
    });
  }

  function backToShelf() {
    el.reader.hidden = true;
    el.home.hidden = false;
    el.readerBody.innerHTML = '';
    engine = null;
    currentNovel = null;
    window.scrollTo(0, 0);
  }

  el.btnBack.addEventListener('click', backToShelf);

  function renderNode(view) {
    el.readerBody.innerHTML = '';
    if (view.kind === 'ending') renderEnding(view);
    else renderChapter(view);
  }

  function renderChapter(view) {
    var heading = document.createElement('h2');
    heading.className = 'chapter-title';
    heading.textContent = view.num + '　' + view.title;
    el.readerBody.appendChild(heading);

    view.paragraphs.forEach(function (text) {
      var p = document.createElement('p');
      p.className = 'prose';
      p.textContent = text;
      el.readerBody.appendChild(p);
    });

    var divider = document.createElement('div');
    divider.className = 'choice-divider';
    divider.innerHTML = '<span></span><em>抉 擇</em><span></span>';
    el.readerBody.appendChild(divider);

    var question = document.createElement('p');
    question.className = 'question';
    question.textContent = view.question;
    el.readerBody.appendChild(question);

    var options = document.createElement('div');
    options.className = 'options';
    view.options.forEach(function (opt, i) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'option';
      button.innerHTML = '<span class="mark">' + OPTION_MARKS[i] + '</span>';
      button.appendChild(document.createTextNode(opt.label));
      button.addEventListener('click', function () { choose(opt.index); });
      options.appendChild(button);
    });
    el.readerBody.appendChild(options);
  }

  function choose(index) {
    var view = engine.choose(index);
    var title = view.kind === 'ending' ? view.num : view.num + '　' + view.title;
    transition(title, function () { renderNode(view); });
  }

  function renderEnding(view) {
    var label = document.createElement('div');
    label.className = 'ending-label';
    label.textContent = view.num;
    el.readerBody.appendChild(label);

    var heading = document.createElement('h2');
    heading.className = 'ending-title';
    heading.textContent = view.title;
    el.readerBody.appendChild(heading);

    var image = document.createElement('img');
    image.className = 'ending-image';
    image.src = currentNovel.dir + '/' + view.image;
    image.alt = '結局意象圖：' + view.title;
    el.readerBody.appendChild(image);

    view.paragraphs.forEach(function (text) {
      var p = document.createElement('p');
      p.className = 'prose';
      p.textContent = text;
      el.readerBody.appendChild(p);
    });

    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'btn btn-ghost btn-restart';
    again.textContent = '重新再讀一次';
    again.addEventListener('click', function () {
      var first = engine.start();
      transition(first.num + '　' + first.title, function () { renderNode(first); });
    });
    el.readerBody.appendChild(again);
  }

  /* ---------- 啟動 ---------- */

  loadNovelScripts(renderHome);
})();
