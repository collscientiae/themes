// Avoid `console` errors in browsers that lack a console.
(function () {
    var method;
    var noop = function () {
    };
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

jQuery.fn.tag = function() {
  return this.prop("tagName").toLowerCase();
};

jQuery.fn.loadKnowl = function (knowlID, label, limit, callback) {

    var selector, response, self = this;
    var url = url = "../" + knowlID + ".html";
    var selector = "section.content";
    if (typeof label !== "undefined") {
        selector += " [label='" + label + "']";
    }

    // If we have elements to modify, make the request
    if (self.length == 0) { return this; }

    jQuery.ajax({
        url: url,
        dataType: "html"
    }).done(function (responseText) {
        // Save response for use in complete callback
        response = arguments;
        if (typeof label == "undefined") {
            var $knowl = $(jQuery.parseHTML(responseText)).find(selector);
        } else {
            var $knowl = $("<div>");
            var $start = $(jQuery.parseHTML(responseText)).find(selector);
            $knowl.append($start.clone());
            var endtag = $start.tag();
            $start.nextUntil(endtag).each(function (idx) {
                // console.log(idx, $(this).html());
                if (typeof limit == "undefined" || idx < limit) {
                    $knowl.append($(this).clone());
                }
            });
        }
        self.html($knowl);
    }).complete(callback && function (jqXHR, status) {
        self.each(callback, response || [jqXHR.responseText, status, jqXHR]);
    });
    return this;
};

collscientia = {
    "storage" : undefined,
    "init" : function() {
        // clear storage, if root hash is different
        var storage = $.initNamespaceStorage("collscientia").localStorage;
        var rhash = $("meta[name='doc_root_hash']").attr("value");
        if(typeof rhash !== "undefined" && storage.get("DOC_ROOT_HASH") != rhash) {
            console.log("clearing local storage");
            storage.removeAll();
        }
        console.log("DOC_ROOT_HASH = " + rhash)
        storage.set("DOC_ROOT_HASH", rhash);
        collscientia.storage = storage;
    },
    "include" : function() {
        $("div[include]").each(function () {
            var $this = $(this);
            var knowlID = $this.attr("include");
            var label = $this.attr("label");
            var limit = $this.attr("limit");
            if (typeof limit !== "undefined") {
                limit = parseInt(limit);
            }
            $this.loadKnowl(knowlID, label, limit,
                function (response, status, xhr) {
                    if (status == "error") {
                        var msg = "Sorry but there was an error: ";
                        $this.html(msg + xhr.status + " " + xhr.statusText);
                    }

                });
        });
    }
};

function initMathjax() {
    var head = document.getElementsByTagName("head")[0], script;
    var proto = /^http:/.test(document.location) ? 'http' : 'https';
    script = document.createElement("script");
    script.type = "text/x-mathjax-config";
    script[(window.opera ? "innerHTML" : "text")] =
        "MathJax.Hub.Config({\n" +
        "  extensions: ['tex2jax.js','fp.js','asciimath2jax.js'],\n" +
        "  jax: ['input/TeX','input/AsciiMath', 'output/SVG'],\n" +
        "  tex2jax: { inlineMath: [['$','$'], ['\\\\(','\\\\)']] },\n" +
        "  asciimath2jax: { delimiters: [['\\\'\\\'','\\\'\\\'']]  },\n" +
        "  TeX: {extensions: ['autoload-all.js']}\n" +
        "});";
    head.appendChild(script);
    script = document.createElement("script");
    script.type = "text/javascript";
    script.src = proto + "://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML";
    head.appendChild(script);
}

function googleAnalytics() {
    var uaid = document.querySelector("meta[name='google_analytics']").account;
    if (uaid !== null) {
        (function (i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r;
            i[r] = i[r] || function () {
                (i[r].q = i[r].q || []).push(arguments)
            }, i[r].l = 1 * new Date();
            a = s.createElement(o), m = s.getElementsByTagName(o)[0];
            a.async = 1;
            a.src = g;
            m.parentNode.insertBefore(a, m)
        })(window, document, 'script', '//www.google-analytics.com/analytics.js', '__gaTracker');

        __gaTracker('create', uaid, 'auto');
        __gaTracker('require', 'linkid');
        __gaTracker('send', 'pageview');
    }
}

function initSageCell() {
    sagecell.loadMathJax  = false;

    sagecell.init(function () {
        document.head.appendChild(
            sagecell.util.createElement("link",
                {rel: "stylesheet", href: "../static/sagecell_overrides.css"}));
    });

    sagecell.makeSagecell({
        inputLocation: 'div.cell-sage',
        hide: ["permalink", "editorToggle"],
        evalButtonText: 'Evaluate'});

    sagecell.makeSagecell({
        inputLocation: 'div.cell-python',
        languages: ["python"],
        hide: ["permalink", "editorToggle"],
        evalButtonText: 'Evaluate'});

    sagecell.makeSagecell({
        inputLocation: 'div.cell-r',
        languages: ["r"],
        hide: ["permalink", "editorToggle"],
        evalButtonText: 'Evaluate'});
}

$(collscientia.init);
$(collscientia.include);
$(initMathjax);
$(initSageCell);
$(googleAnalytics);
