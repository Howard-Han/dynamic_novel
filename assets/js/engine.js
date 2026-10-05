/* 劇情引擎：狀態旗標 + DAG 節點推進
   資料格式見 novels/<id>/data.js，路由規則見各小說的 劇情樹狀圖.md

   條件寫法（選項、分支、段落通用）：
     if:    旗標名稱，或陣列（全部成立）
     ifAny: 陣列（任一成立）
     ifNot: 旗標名稱（不成立時）
*/
window.Engine = (function () {
  'use strict';

  function test(cond, flags) {
    if (cond.ifNot && flags[cond.ifNot]) return false;
    if (cond.ifAny && !cond.ifAny.some(function (f) { return flags[f]; })) return false;
    if (cond.if) {
      var all = Array.isArray(cond.if) ? cond.if : [cond.if];
      if (!all.every(function (f) { return flags[f]; })) return false;
    }
    return true;
  }

  function create(novel) {
    var flags = {};
    var currentId = null;

    function setFlags(list) {
      (list || []).forEach(function (f) { flags[f] = true; });
    }

    function isEnding(id) {
      return Object.prototype.hasOwnProperty.call(novel.endings, id);
    }

    /* 進入節點：套用 enterSet 後回傳可渲染的內容 */
    function enter(id) {
      currentId = id;
      var node = isEnding(id) ? novel.endings[id] : novel.chapters[id];
      setFlags(node.enterSet);
      return view(id, node);
    }

    /* 依旗標過濾條件段落 */
    function paragraphs(node) {
      return node.text.reduce(function (out, p) {
        if (typeof p === 'string') out.push(p);
        else if (test(p, flags)) out.push(p.text);
        return out;
      }, []);
    }

    function view(id, node) {
      var v = {
        id: id,
        kind: isEnding(id) ? 'ending' : 'chapter',
        num: node.num,
        title: node.title,
        paragraphs: paragraphs(node)
      };
      if (v.kind === 'ending') {
        v.image = node.image;
      } else {
        v.question = node.question;
        v.options = node.options
          .map(function (opt, i) { return { index: i, label: opt.label, requires: opt.requires }; })
          .filter(function (opt) {
            return !opt.requires || test({ if: opt.requires }, flags);
          });
      }
      return v;
    }

    return {
      get flags() { return Object.assign({}, flags); },
      get currentId() { return currentId; },

      start: function () {
        flags = {};
        return enter(novel.start);
      },

      /* index 為原始選項索引（view.options[].index） */
      choose: function (index) {
        var opt = novel.chapters[currentId].options[index];
        setFlags(opt.set);

        var next = opt.to;
        if (opt.branch) {
          for (var i = 0; i < opt.branch.length; i++) {
            if (test(opt.branch[i], flags)) {
              setFlags(opt.branch[i].set);
              next = opt.branch[i].to;
              break;
            }
          }
        }
        return enter(next);
      }
    };
  }

  return { create: create };
})();
