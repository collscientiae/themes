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
        "  asciimath2jax: { delimiters: [['``','``']]  },\n" +
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

$(googleAnalytics);
$(initMathjax);