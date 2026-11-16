(function() {
  'use strict';
  var esc = function(s) { return String(s).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };

  // Hand-picked toy example, kept separate from measured research data.
  // Root choices sum to one; every later candidate set keeps 0.8 of the mass.
  // Unary gives a later position one score per word, averaged over the earlier choice
  // (0.52 × 0.72 + 0.48 × 0.08 ≈ 0.41 for "soup"). Conditional scoring favours the
  // continuation that fits the previous word.
  var WORDS = [['hot', 'ice'], ['soup', 'cream'], ['steams', 'melts']];
  var TARGET = [1, 1, 1];
  var ROOT = [0.52, 0.48], UNARY = [0.41, 0.39], FITS = 0.72, CLASHES = 0.08;
  var DEPTH = WORDS.length, MAX_BUDGET = 14;

  function candidates(mode) {
    var nodes = [];
    function expand(parent, prefix, mass) {
      if (prefix.length === DEPTH) return;
      [0, 1].forEach(function(choice) {
        var depth = prefix.length, p;
        if (depth === 0) p = ROOT[choice];
        else if (mode === 'conditional') p = choice === prefix[depth - 1] ? FITS : CLASHES;
        else p = UNARY[choice];
        var path = prefix.concat(choice), id = 'n' + path.join('-');
        nodes.push({id: id, parent: parent, depth: depth + 1, path: path, token: WORDS[depth][choice], mass: mass * p});
        expand(id, path, mass * p);
      });
    }
    expand('root', [], 1);
    return nodes;
  }

  // Best-first, prefix-closed allocation: a child becomes available once its parent is chosen.
  function allocate(mode, budget) {
    var nodes = candidates(mode), chosen = [], frontier = nodes.filter(function(n) { return n.depth === 1; });
    while (chosen.length < budget && frontier.length) {
      frontier.sort(function(a, b) { return b.mass - a.mass || a.id.localeCompare(b.id); });
      var next = frontier.shift();
      chosen.push(next.id);
      frontier.push.apply(frontier, nodes.filter(function(n) { return n.parent === next.id; }));
    }
    return chosen;
  }

  function targetId(depth) { return 'n' + TARGET.slice(0, depth).join('-'); }

  function matched(mode, budget) {
    var selected = allocate(mode, budget), depth = 0;
    while (depth < DEPTH && selected.indexOf(targetId(depth + 1)) !== -1) depth++;
    return depth;
  }

  // Per-node display state: selection order, matched target word, first missed target word.
  function treeState(mode, budget) {
    var selected = allocate(mode, budget), count = matched(mode, budget), state = {};
    candidates(mode).forEach(function(n) {
      var index = selected.indexOf(n.id), onTarget = n.id === targetId(n.depth);
      state[n.id] = {
        index: index,
        match: onTarget && n.depth <= count,
        miss: onTarget && n.depth === count + 1
      };
    });
    return state;
  }

  function nodeClass(s) {
    return 'pt-candidate' + (s.index !== -1 ? ' is-selected' : '') + (s.match ? ' is-match' : '') + (s.miss ? ' is-miss' : '');
  }
  function edgeClass(s) {
    return 'pt-edge' + (s.index !== -1 ? ' is-selected' : '') + (s.match ? ' is-match' : '');
  }
  function treeLabel(mode, budget) {
    var name = mode === 'unary' ? 'Unary' : 'PairTree';
    return name + ' tree, ' + budget + ' selected nodes, ' + matched(mode, budget) + ' of 3 target words matched.';
  }

  function layout(mode) {
    var xy = {root: [14, 140]};
    candidates(mode).forEach(function(n) {
      var v = parseInt(n.path.join(''), 2), span = 8 / Math.pow(2, n.depth);
      xy[n.id] = [[0, 88, 190, 302][n.depth], 28 + (v * span + (span - 1) / 2) * 32];
    });
    return xy;
  }

  function renderTree(mode, budget) {
    var nodes = candidates(mode), state = treeState(mode, budget), xy = layout(mode);
    var svg = '<svg class="pt-candidate-tree" viewBox="0 0 360 280" role="img" aria-label="' + treeLabel(mode, budget) + '">';
    nodes.forEach(function(n) {
      var a = xy[n.parent], b = xy[n.id];
      svg += '<line data-edge="' + n.id + '" class="' + edgeClass(state[n.id]) + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>';
    });
    svg += '<circle class="pt-root" cx="14" cy="140" r="7"/>';
    nodes.forEach(function(n) {
      var b = xy[n.id], s = state[n.id], width = n.depth === 1 ? 58 : 80, bx = b[0] + width / 2 - 2, by = b[1] - 12;
      svg += '<g data-node="' + n.id + '" class="' + nodeClass(s) + '">' +
        '<rect x="' + (b[0] - width / 2) + '" y="' + (b[1] - 14) + '" width="' + width + '" height="28" rx="6"/>' +
        '<text class="pt-token" x="' + b[0] + '" y="' + (b[1] + 5) + '">' + esc(n.token) + '</text>' +
        '<g class="pt-badge"><circle cx="' + bx + '" cy="' + by + '" r="7"/><text class="pt-rank" x="' + bx + '" y="' + (by + 3.5) + '">' + (s.index !== -1 ? s.index + 1 : '') + '</text></g>' +
        '</g>';
    });
    return svg + '</svg>';
  }

  // Updates an existing tree in place so CSS transitions can run.
  function applyTree(svg, mode, budget) {
    var state = treeState(mode, budget);
    svg.setAttribute('aria-label', treeLabel(mode, budget));
    Object.keys(state).forEach(function(id) {
      var s = state[id], node = svg.querySelector('[data-node="' + id + '"]'), edge = svg.querySelector('[data-edge="' + id + '"]');
      node.setAttribute('class', nodeClass(s));
      edge.setAttribute('class', edgeClass(s));
      if (s.index !== -1) node.querySelector('.pt-rank').textContent = s.index + 1;
    });
  }

  function renderOutcome(mode, budget) {
    var count = matched(mode, budget);
    return '<div class="pt-match-count"><strong>' + count + '<small> / 3</small></strong><span>target words matched</span></div>' +
      '<div class="pt-target-tokens">' + TARGET.map(function(c, i) {
        var cls = i < count ? 'is-match' : i === count ? 'is-miss' : 'is-unreached';
        var sr = i < count ? 'matched' : i === count ? 'missing' : 'not reached';
        return '<span class="' + cls + '">' + esc(WORDS[i][c]) + '<span class="pt-sr-only">: ' + sr + '</span></span>';
      }).join('') + '</div>';
  }

  function treeDescription(budget) {
    var u = matched('unary', budget), c = matched('conditional', budget), difference = Math.abs(c - u);
    var tokens = function(n) { return n === 1 ? 'word' : 'words'; };
    var lead = c === u ? 'Both trees match ' + u + ' target ' + tokens(u) + '.' :
      'PairTree matches ' + difference + (c > u ? ' more' : ' fewer') + ' target ' + tokens(difference) + '.';
    if (budget === MAX_BUDGET) return lead + ' The whole tree fits, so scoring no longer changes coverage.';
    if (c > u && budget === 6) return lead + ' Unary spends its six nodes on every two-word pair, “ice soup” and “hot cream” included.';
    if (c > u && u === 2) return lead + ' Unary reaches “melts” only once all ' + MAX_BUDGET + ' nodes fit.';
    return lead;
  }

  function renderScores() {
    var a = candidates('unary'), b = candidates('conditional');
    return '<table><thead><tr><th>Draft prefix</th><th>Unary path score</th><th>Conditional path score</th></tr></thead><tbody>' +
      a.map(function(n, i) {
        return '<tr><td>' + esc(n.path.map(function(c, d) { return WORDS[d][c]; }).join(' → ')) + '</td><td>' + n.mass.toFixed(4) + '</td><td>' + b[i].mass.toFixed(4) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function massValues(retained, depth) { var mass = Math.pow(retained / 100, depth); return {mass: mass, inflation: 1 / mass}; }

  function renderMass(retained, depth) {
    var v = massValues(retained, depth), pct = function(n) { return (n * 100).toFixed(n < 0.001 ? 4 : 1) + '%'; };
    var strip = function(label, parts) {
      return '<div class="pt-strip-label">' + label + '</div><div class="pt-mass-strip" aria-hidden="true">' +
        parts.map(function(p, i) { return '<span class="pt-segment pt-segment-' + i + '" style="width:' + p + '%"></span>'; }).join('') + '</div>';
    };
    var row = function(label, share, value, accent) {
      return '<div class="pt-bar-row' + (accent ? ' is-accent' : '') + '"><span class="pt-bar-label">' + label + '</span>' +
        '<div class="pt-bar-track"><span class="pt-bar" style="width:' + share * 100 + '%"></span><span class="pt-bar-value">' + value + '</span></div></div>';
    };
    return strip('Top-K renormalized: A 75% · B 25% · outside 0%', [75, 25, 0]) +
      strip('Mass preserved: A ' + (retained * 0.75).toFixed(1) + '% · B ' + (retained * 0.25).toFixed(1) + '% · outside ' + (100 - retained) + '%', [retained * 0.75, retained * 0.25, 100 - retained]) +
      '<div class="pt-mass-legend"><span><i class="pt-segment-0"></i>Candidate A</span><span><i class="pt-segment-1"></i>Candidate B</span><span><i class="pt-segment-2"></i>Outside the set</span></div>' +
      '<div class="pt-mass-compare"><div class="pt-compare-title">Mass on paths inside the candidate sets, after ' + depth + ' draft ' + (depth === 1 ? 'position' : 'positions') + '</div>' +
      '<div class="pt-bars">' + row('Mass preserved', v.mass, pct(v.mass), true) + row('Renormalized each step', 1, '100%', false) + '</div>' +
      '<div class="pt-compare-note">' + (v.inflation > 1.005 ? 'Renormalizing gives these paths ' + v.inflation.toFixed(2) + '× the mass the scoring model assigns them.' : 'With nothing outside the sets, both give the same mass.') + '</div></div>';
  }

  var api = {words: WORDS, target: TARGET, candidates: candidates, allocate: allocate, matched: matched, treeState: treeState,
    renderTree: renderTree, renderOutcome: renderOutcome, treeDescription: treeDescription, renderScores: renderScores,
    massValues: massValues, renderMass: renderMass};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  document.querySelectorAll('[data-pairtree-visual="tree"]').forEach(function(f) {
    f.classList.add('is-interactive');
    var slider = f.querySelector('input');
    function update() {
      var b = Number(slider.value);
      f.querySelector('output').textContent = b;
      ['unary', 'conditional'].forEach(function(m) {
        var svg = f.querySelector('[data-tree="' + m + '"] svg');
        if (svg) applyTree(svg, m, b); else f.querySelector('[data-tree="' + m + '"]').innerHTML = renderTree(m, b);
        f.querySelector('[data-outcome="' + m + '"]').innerHTML = renderOutcome(m, b);
      });
      f.querySelector('[data-tree-description]').textContent = treeDescription(b);
    }
    slider.addEventListener('input', update);
    update();
  });

  document.querySelectorAll('[data-pairtree-visual="mass"]').forEach(function(f) {
    f.classList.add('is-interactive');
    function update() {
      var r = Number(f.querySelector('[data-retained]').value), d = Number(f.querySelector('[data-depth]').value);
      f.querySelector('[data-retained-output]').textContent = r + '%';
      f.querySelector('[data-depth-output]').textContent = d;
      f.querySelector('[data-mass-view]').innerHTML = renderMass(r, d);
    }
    f.querySelectorAll('input').forEach(function(i) { i.addEventListener('input', update); });
    update();
  });
})();
