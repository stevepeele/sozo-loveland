// SOZO Loveland — magical interactions (PLX-449)
// Command palette, Find-Your-Fit quiz, live gathering ticker, connect composer.
// All client-side. Palette mounts site-wide; quiz/ticker/composer mount on the homepage.
(function(){
  "use strict";

  function el(tag, cls, html){
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }

  /* ================= command palette ("Ask Sozo") ================= */
  var INDEX = [
    {t:"Plan Your Visit", d:"Sundays 10AM–12PM · 9781 Fields Ertel Rd, Loveland", h:"visit.html", k:"visit plan sunday come new here first time"},
    {t:"Messages — Message Tracks", d:"Series as albums, messages as tracks. Press play.", h:"sermons.html", k:"messages sermons tracks series watch listen archive"},
    {t:"The Kingdom At Hand — current series", d:"3 tracks · what we're teaching now", h:"sermons.html#current", k:"kingdom current series now"},
    {t:"What's the Gospel? — start here", d:"The good news, plainly. New to faith? Start here.", h:"sermons.html#gospel", k:"gospel faith new jesus saved start"},
    {t:"Ministries — find your people", d:"SOZO Kids, Groups, Worship, Outreach", h:"ministries.html", k:"ministries kids groups worship outreach serve youth"},
    {t:"SOZO Kids", d:"Nursery through 6th grade · check-in from 10:15 AM", h:"ministries.html#kids", k:"kids children nursery family"},
    {t:"The Venue — book the room", d:"Room + concert-grade sound + engineer, one package", h:"venue.html", k:"venue book rent concert wedding event space"},
    {t:"Events — gather, grow, go", d:"Men's Watch Party 10/25 · Glow Party 10/30", h:"events.html", k:"events calendar party watch"},
    {t:"Contribute", d:"Fuel the mission", h:"contribute.html", k:"contribute give donate offering tithe"},
    {t:"Contact — say hello", d:"Questions, prayer, or just to talk", h:"contact.html", k:"contact hello prayer question talk email"},
    {t:"Our Vision — Open. Embrace. Link.", d:"The journey we're on together", h:"about.html", k:"vision about believe values open embrace link"},
    {t:"Leadership — meet our pastors", d:"The people who'll greet you at the door", h:"leadership.html", k:"leadership pastors steve tara staff"}
  ];

  var palette, palInput, palList, palOpen = false, palSel = 0, palItems = INDEX.slice();

  function base(){ // resolve relative links from any page depth (site is flat, but be safe)
    return "";
  }

  function buildPalette(){
    palette = el("div", "pal-overlay");
    palette.innerHTML =
      '<div class="pal-box" role="dialog" aria-label="Ask Sozo">' +
        '<div class="pal-head"><span class="pal-title">Ask Sozo</span><span class="pal-hint">↑↓ navigate · ↵ open · esc close</span></div>' +
        '<div class="pal-searchrow"><input class="pal-input" type="text" placeholder="Try &quot;plan a visit&quot;, &quot;watch&quot;, &quot;venue&quot;…" aria-label="Search the site">' +
        '<button class="pal-mic" aria-label="Search by voice" title="Search by voice">🎙</button></div>' +
        '<div class="pal-list" role="listbox"></div>' +
      "</div>";
    document.body.appendChild(palette);
    palInput = palette.querySelector(".pal-input");
    palList = palette.querySelector(".pal-list");
    var mic = palette.querySelector(".pal-mic");
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { mic.style.display = "none"; }
    else {
      mic.addEventListener("click", function(){
        var rec = new SR();
        rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
        mic.classList.add("listening"); mic.textContent = "●";
        rec.onresult = function(e){
          palInput.value = e.results[0][0].transcript;
          renderPal(palInput.value); palInput.focus();
        };
        rec.onend = function(){ mic.classList.remove("listening"); mic.textContent = "🎙"; };
        rec.onerror = rec.onend;
        try { rec.start(); } catch(err){ rec.onend(); }
      });
    }
    palette.addEventListener("click", function(e){ if (e.target === palette) closePal(); });
    palInput.addEventListener("input", function(){ renderPal(palInput.value); });
    palInput.addEventListener("keydown", function(e){
      if (e.key === "ArrowDown"){ e.preventDefault(); palSel = Math.min(palSel+1, palItems.length-1); paintSel(); }
      else if (e.key === "ArrowUp"){ e.preventDefault(); palSel = Math.max(palSel-1, 0); paintSel(); }
      else if (e.key === "Enter"){ var it = palItems[palSel]; if (it) location.href = base() + it.h; }
      else if (e.key === "Escape"){ closePal(); }
    });
    renderPal("");
  }

  function score(it, q){
    q = q.trim().toLowerCase();
    if (!q) return 1;
    var t = (it.t + " " + it.d + " " + it.k).toLowerCase();
    var words = q.split(/\s+/), s = 0;
    for (var i=0;i<words.length;i++){
      var w = words[i];
      if (!w) continue;
      if (it.t.toLowerCase().indexOf(w) === 0) s += 3;
      else if (t.indexOf(w) >= 0) s += 1;
      else return -1;
    }
    return s;
  }

  function renderPal(q){
    palItems = INDEX.map(function(it){ return {it:it, s:score(it,q)}; })
      .filter(function(x){ return x.s >= 0; })
      .sort(function(a,b){ return b.s - a.s; })
      .map(function(x){ return x.it; });
    palSel = 0;
    paintSel();
  }

  function paintSel(){
    palList.innerHTML = "";
    if (!palItems.length){
      palList.appendChild(el("div","pal-empty","Nothing found — try “visit”, “watch”, or “venue”."));
      return;
    }
    palItems.forEach(function(it, i){
      var row = el("a","pal-row"+(i===palSel?" sel":""),'<span class="pal-row-t">'+it.t+'</span><span class="pal-row-d">'+it.d+'</span>');
      row.href = base() + it.h;
      row.setAttribute("role","option");
      row.addEventListener("click", function(e){ e.preventDefault(); location.href = base() + it.h; });
      row.addEventListener("mousemove", function(){ if (palSel!==i){ palSel=i; paintSel(); } });
      palList.appendChild(row);
    });
    var sel = palList.children[palSel];
    if (sel && sel.scrollIntoView) sel.scrollIntoView({block:"nearest"});
  }

  function openPal(){ if(!palette) buildPalette(); palOpen=true; palette.classList.add("show"); palInput.value=""; renderPal(""); setTimeout(function(){palInput.focus();},30); }
  function closePal(){ palOpen=false; if(palette) palette.classList.remove("show"); }
  function togglePal(){ palOpen ? closePal() : openPal(); }

  function buildPill(){
    var pill = el("button","pal-pill",'<span class="pal-pill-k">⌘K</span> Ask Sozo');
    pill.setAttribute("aria-label","Open site search (Command K)");
    pill.addEventListener("click", togglePal);
    document.body.appendChild(pill);
  }

  document.addEventListener("keydown", function(e){
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"){ e.preventDefault(); togglePal(); }
    else if (e.key === "Escape" && palOpen){ closePal(); }
  });

  /* ================= find-your-fit quiz ================= */
  var QUIZ = [
    { q:"What's bringing you through the door?", opts:["Exploring faith","New to the area","Looking for community","Planning an event"] },
    { q:"Who's coming with you?", opts:["Just me","My family","My kids","A group"] },
    { q:"What do you want first?", opts:["Watch a message","Meet people","Serve somewhere"] }
  ];
  var ANSWERS = { bring:null, who:null, want:null };

  function fitResult(){
    var bring = ANSWERS.bring, want = ANSWERS.want, who = ANSWERS.who;
    var title = "Your front-porch path";
    var steps = [];
    if (bring === 3){ // planning an event
      return { title:"Your venue path",
        steps:[["Tour the room","venue.html","See the space, the sound, and what's included"],
               ["Check your date","venue.html#inquire","Three quick answers — we'll come back with a quote"]] };
    }
    if (want === 0){
      steps.push(["Start the current track","sermons.html#current","“The Kingdom At Hand” — 3 messages, start at track 01"]);
    } else if (want === 2){
      steps.push(["Find your team","ministries.html","Worship, kids, outreach — there's a seat with your name on it"]);
    } else {
      steps.push(["Come this Sunday","visit.html","10AM–12PM · we'll meet you at the door"]);
    }
    if (bring === 0) steps.push(["The gospel, plainly","sermons.html#gospel","“What's the Gospel?” — start at the beginning"]);
    if (who === 2 || who === 1) steps.push(["SOZO Kids","ministries.html#kids","Nursery through 6th grade · check-in from 10:15 AM"]);
    if (want === 1) steps.push(["SOZO Groups","ministries.html#groups","Men's, women's, youth — life is better together"]);
    if (!steps.length) steps.push(["Plan your visit","visit.html","Tell us you're coming — we'll handle the rest"]);
    steps.push(["Plan your visit","visit.html","Sundays 10AM–12PM · 9781 Fields Ertel Rd"]);
    // de-dupe by href, keep first 3
    var seen = {}, out = [];
    steps.forEach(function(s){ if(!seen[s[1]]){ seen[s[1]]=1; out.push(s); } });
    return { title:title, steps: out.slice(0,3) };
  }

  function buildQuiz(){
    var root = document.getElementById("fit-quiz");
    if (!root) return;
    var step = 0;
    function render(){
      root.innerHTML = "";
      if (step < QUIZ.length){
        var q = QUIZ[step];
        var box = el("div","fit-box");
        box.appendChild(el("p","eyebrow","Question "+(step+1)+" of "+QUIZ.length));
        box.appendChild(el("h3","fit-q",q.q));
        var opts = el("div","fit-opts");
        q.opts.forEach(function(o, i){
          var b = el("button","chip fit-opt",o);
          b.addEventListener("click", function(){
            if (step===0) ANSWERS.bring=i; else if (step===1) ANSWERS.who=i; else ANSWERS.want=i;
            step++; render();
          });
          opts.appendChild(b);
        });
        box.appendChild(opts);
        if (step>0){
          var back = el("button","fit-back","← back");
          back.addEventListener("click", function(){ step--; render(); });
          box.appendChild(back);
        }
        root.appendChild(box);
      } else {
        var r = fitResult();
        var box2 = el("div","fit-box fit-done");
        box2.appendChild(el("p","eyebrow","Your path"));
        box2.appendChild(el("h3","fit-q",r.title));
        var list = el("div","fit-steps");
        r.steps.forEach(function(s, i){
          var a = el("a","fit-step",'<span class="track-no">0'+(i+1)+'</span><span><strong>'+s[0]+'</strong><br><small>'+s[2]+'</small></span><span class="go">→</span>');
          a.href = s[1];
          list.appendChild(a);
        });
        box2.appendChild(list);
        var again = el("button","fit-back","↻ retake");
        again.addEventListener("click", function(){ step=0; ANSWERS={bring:null,who:null,want:null}; render(); });
        box2.appendChild(again);
        root.appendChild(box2);
      }
    }
    render();
  }

  /* ================= live gathering ticker ================= */
  function zonedToUtc(y,mo,da,h,mi,tz){
    var guess = new Date(Date.UTC(y,mo,da,h,mi));
    var asTz = new Date(guess.toLocaleString("en-US",{timeZone:tz}));
    var asUtc = new Date(guess.toLocaleString("en-US",{timeZone:"UTC"}));
    return new Date(guess.getTime() + (asUtc - asTz));
  }
  function nextSunday10ET(){
    var now = new Date();
    var etParts = new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"numeric",day:"numeric",weekday:"short",hour:"numeric",hour12:false}).formatToParts(now);
    var p = {}; etParts.forEach(function(x){ p[x.type]=x.value; });
    var et = new Date(+p.year, +p.month-1, +p.day, +p.hour%24);
    var add = (7 - et.getDay()) % 7;
    var target = new Date(et); target.setDate(target.getDate()+add); target.setHours(10,0,0,0);
    var abs = zonedToUtc(target.getFullYear(), target.getMonth(), target.getDate(), 10, 0, "America/New_York");
    if (abs <= now) abs = new Date(abs.getTime() + 7*864e5);
    return abs;
  }
  var TICKER_EVENTS = [
    "Men's Watch Party — Bengals vs Ravens · Sat Oct 25, 1PM",
    "Light the Night Glow Party · Fri Oct 30, 7–10PM",
    "SOZO Groups gather weekly — find yours"
  ];
  function buildTicker(){
    var root = document.getElementById("live-ticker");
    if (!root) return;
    var target = nextSunday10ET(), ev = 0;
    function fmt(ms){
      if (ms < 0) ms = 0;
      var s = Math.floor(ms/1000), d = Math.floor(s/86400); s%=86400;
      var h = Math.floor(s/3600), m = Math.floor(s%3600/60), ss = s%60;
      return d+"d "+h+"h "+m+"m "+ss+"s";
    }
    function render(){
      var left = target - new Date();
      if (left < 0){ target = nextSunday10ET(); left = target - new Date(); }
      root.innerHTML =
        '<span class="tick-live"><span class="tick-dot"></span>LIVE</span>' +
        '<span class="tick-main">Next gathering <strong>Sunday 10AM</strong> — in <strong class="tick-count">'+fmt(left)+'</strong></span>' +
        '<span class="tick-sep">·</span>' +
        '<span class="tick-ev">'+TICKER_EVENTS[ev % TICKER_EVENTS.length]+'</span>' +
        '<a class="tick-cta" href="visit.html">Plan your visit →</a>';
    }
    render();
    setInterval(render, 1000);
    setInterval(function(){ ev++; render(); }, 6000);
  }

  /* ================= connect composer ================= */
  var TABS = {
    prayer:{ label:"Prayer", ph:"What's on your heart? (e.g. healing for my mom, wisdom for a decision…)", cta:"Ask for prayer" },
    serve:{ label:"Serve", ph:"Where would you like to help? (e.g. worship team, SOZO Kids, outreach…)", cta:"Raise my hand" },
    visit:{ label:"Visit", ph:"Anything we should know before Sunday? (kids' ages, questions…)", cta:"Plan my visit" },
    venue:{ label:"Venue", ph:"Tell us about your event — type, date, what you need…", cta:"Check the date" }
  };
  function buildComposer(){
    var root = document.getElementById("connect-composer");
    if (!root) return;
    var tab = "prayer";
    function render(){
      root.innerHTML = "";
      var tabs = el("div","comp-tabs");
      Object.keys(TABS).forEach(function(k){
        var b = el("button","chip"+(k===tab?" comp-active":""), TABS[k].label);
        b.setAttribute("aria-pressed", k===tab ? "true" : "false");
        b.addEventListener("click", function(){ tab=k; render(); });
        tabs.appendChild(b);
      });
      root.appendChild(tabs);
      var body = el("div","comp-body");
      body.innerHTML =
        '<div class="field"><label for="cc-name">Your name</label><input id="cc-name" type="text" placeholder="So we know who this is from"></div>' +
        '<div class="field"><label for="cc-msg">'+TABS[tab].label+'</label><textarea id="cc-msg" rows="3" placeholder="'+TABS[tab].ph+'"></textarea></div>' +
        '<button class="btn btn-primary" id="cc-send">'+TABS[tab].cta+' →</button>';
      root.appendChild(body);
      body.querySelector("#cc-send").addEventListener("click", function(){
        var name = body.querySelector("#cc-name").value.trim() || "A friend";
        var safeName = name.replace(/</g,"&lt;").split(" ")[0];
        var msg = body.querySelector("#cc-msg").value.trim();
        root.innerHTML = "";
        var r = el("div","comp-receipt");
        r.innerHTML = '<p class="eyebrow">Received</p><h3>Thanks, '+safeName+' — we\'ve got it.</h3>' +
          (msg ? '<p class="comp-quote">“'+msg.replace(/</g,"&lt;")+'”</p>' : '') +
          '<p>Someone from the SOZO family will follow up. If it\'s urgent, reach out directly:</p>' +
          '<div class="btn-row"><a class="btn btn-dark" href="contact.html">Contact us →</a>' +
          '<button class="btn btn-ghost" id="cc-again">Write another</button></div>';
        root.appendChild(r);
        r.querySelector("#cc-again").addEventListener("click", render);
      });
    }
    render();
  }

  /* ================= venue before/after slider ================= */
  function buildSlider(){
    var wrap = document.getElementById("venue-ba");
    if (!wrap) return;
    var after = document.getElementById("ba-after");
    var handle = document.getElementById("ba-handle");
    var afterImg = after.querySelector("img");
    function setPos(clientX){
      var r = wrap.getBoundingClientRect();
      var p = Math.max(2, Math.min(98, (clientX - r.left) / r.width * 100));
      after.style.width = p + "%";
      afterImg.style.width = r.width + "px";
      handle.style.left = p + "%";
    }
    setPos(wrap.getBoundingClientRect().left + wrap.getBoundingClientRect().width * 0.5);
    var drag = false;
    handle.addEventListener("pointerdown", function(e){ drag = true; handle.setPointerCapture(e.pointerId); });
    window.addEventListener("pointerup", function(){ drag = false; });
    window.addEventListener("pointermove", function(e){ if (drag) setPos(e.clientX); });
    wrap.addEventListener("click", function(e){ if (!drag) setPos(e.clientX); });
    window.addEventListener("resize", function(){
      var r = wrap.getBoundingClientRect();
      afterImg.style.width = r.width + "px";
    });
  }

  /* ================= video tracks (inline YouTube players) ================= */
  function buildVideoTracks(){
    var tracks = document.querySelectorAll(".vtrack");
    if (!tracks.length) return;
    tracks.forEach(function(li){
      var btn = li.querySelector(".vtrack-btn");
      var player = li.querySelector(".vtrack-player");
      if (!btn || !player) return;
      btn.addEventListener("click", function(){
        var open = btn.getAttribute("aria-expanded") === "true";
        document.querySelectorAll(".vtrack").forEach(function(o){
          if (o !== li){
            o.querySelector(".vtrack-player").hidden = true;
            o.querySelector(".vtrack-player").innerHTML = "";
            o.querySelector(".vtrack-btn").setAttribute("aria-expanded", "false");
          }
        });
        if (open){
          player.hidden = true; player.innerHTML = "";
          btn.setAttribute("aria-expanded", "false");
        } else {
          var v = li.getAttribute("data-video");
          var label = btn.getAttribute("aria-label") || "Message video";
          player.innerHTML = '<iframe src="https://www.youtube.com/embed/' + v + '?autoplay=1&rel=0" title="' + label.replace(/"/g,"") + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
          player.hidden = false;
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ================= boot ================= */
  buildPill();
  buildQuiz();
  buildTicker();
  buildComposer();
  buildSlider();
  buildVideoTracks();
})();
