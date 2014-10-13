// Avoid `console` errors in browsers that lack a console.
(function () {
    'use strict';
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

jQuery.fn.tag = function () {
    'use strict';
    return this.prop("tagName").toLowerCase();
};

jQuery.fn.loadPartial = function (part_id, label, limit, callback) {
    'use strict';
    var response, self = this;
    var url = url = "../" + part_id + ".html";
    var selector = "section.content";
    if (typeof label !== "undefined") {
        selector += " [label='" + label + "']";
    }

    // If we have elements to modify, make the request
    if (self.length == 0) {
        return this;
    }

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

var collscientia = {
    "knowl_id_counter": 0,
    "storage": undefined,
    "init": function () {
        'use strict';
        // clear storage, if root hash is different
        var storage = $.initNamespaceStorage("collscientia").localStorage;
        var rhash = $("meta[name='doc_root_hash']").attr("value");
        if (typeof rhash !== "undefined" && storage.get("DOC_ROOT_HASH") != rhash) {
            console.log("clearing local storage");
            storage.removeAll();
        }
        console.log("DOC_ROOT_HASH = " + rhash);
        storage.set("DOC_ROOT_HASH", rhash);
        collscientia.storage = storage;

        // activate sage cells
        $("body").on("click", "a.activate_cell", function (event) {
            event.preventDefault();
            var cell_id = $(this).attr("target");
            var $activate_link = $(this);
            $activate_link.text("loading ...");
            $activate_link.removeAttr("target");
            collscientia.sagecellify(cell_id, function () {
                $activate_link.hide();
            });
        });

        // handle clicks on knowls
        $("body").on("click", "*[knowl]", function (event) {
            event.preventDefault();
            var $knowl = $(this);
            collscientia.handle_knowl($knowl);
        });

        collscientia.create_sagecell_links($("section.content"));
    },
    "handle_knowl": function ($link) {
        'use strict';
        //var kid = $link.attr("knowl");
        //var url = "../" + kid + ".html";
        //var $knowl = $("<p>")
        //    .attr("class", "knowl")
        //    .append("knowl: " + kid + " url: " + url);
        //$link.parent().append($knowl);

        var knowl_id = $link.attr("knowl");
        // the uid is necessary if we want to reference the same content several times

        // each knowl "link" needs to have a unique ID
        if (!$link.attr("knowl-uid")) {
            $link.attr("knowl-uid", collscientia.knowl_id_counter);
            collscientia.knowl_id_counter++;
        }
        var uid = $link.attr("knowl-uid");
        var output_id = '#knowl-output-' + uid;
        var $output_id = $(output_id);
        var url = "../" + knowl_id + ".html";
        // create the element for the content, insert it after the one where the
        // knowl element is included (e.g. inside a <h1> tag) (sibling in DOM)
        var idtag = "id='" + output_id.substring(1) + "'";
        //var kid = "id='kuid-" + uid + "'";
        // if we already have the content, toggle visibility
        if ($output_id.length > 0) {
            $("#kuid-" + uid).slideToggle("fast");
            $link.toggleClass("active");

            // otherwise download it or get it from the cache
        } else {

            var $knowl = $("<div>")
                .attr("class", "knowl")
                .attr("id", "kuid-" + uid)
                .append($("<div>")
                    .addClass("knowl-output")
                    .attr("id", output_id.substring(1))
                    .text("loading ..."))
                .append($("<div>")
                    .addClass("knowl-footer")
                    .html($("<a>")
                        .attr("href", url)
                        .text(knowl_id)));

            // check, if the knowl is inside a td or th in a table.
            // otherwise assume its properly sitting inside a <div> or <p>
            if ($link.parent().is("td") || $link.parent().is("th")) {
                // assume we are in a td or th tag, go 2 levels up
                var cols = $link.parent().parent().children().length;
                $link.parents().eq(1).after(
                    $knowl.wrap("<tr><td colspan='" + cols + "'></td></tr>"));
            } else if ($link.parent().is("li")) {
                $link.parent().after($knowl);
            }
            // the following is implemented stupidly, but I had to do it quickly.
            // someone please replace it with an appropriate loop -- DF
            // the '.is("p")' is for the first paragraph of a theorem or proof
            //also, after you close the knowl, it still has a shaded background
            else if ($link.parent().parent().is("li")) {
                $link.parent().parent().after($knowl);
            }
            else if ($link.parent().css('display') == "block" || $link.parent().is("p")) {
                $link.parent().after($knowl);
            } else if ($link.parent().parent().css('display') == "block" || $link.parent().parent().is("p")) {
                $link.parent().parent().after($knowl);
            } else {
                $link.parent().parent().parent().after($knowl);
            }

            var $output = $knowl.find(output_id);
            //var $knowl = $("#kuid-" + uid);
            $output.addClass("loading");
            $knowl.hide();
            // DRG: inline code
            if ($link.attr("class") == 'internal') {
                $output.html($link.attr("value"));
                $knowl.hide();
                $link.addClass("active");
                if (window.MathJax == undefined) {
                    $knowl.slideDown("slow");
                } else {
                    MathJax.Hub.Queue(['Typeset', MathJax.Hub, $output.get(0)]);
                    MathJax.Hub.Queue([function () {
                        $knowl.slideDown("slow");
                    }]);
                }
            } else if ($link.attr("class") == 'id-ref') {
                $output.html($("#".concat($link.attr("refid"))).text());
                $knowl.hide();
                $link.addClass("active");
                if (window.MathJax == undefined) {
                    $knowl.slideDown("slow");
                } else {
                    MathJax.Hub.Queue(['Typeset', MathJax.Hub, $output.get(0)]);
                    MathJax.Hub.Queue([function () {
                        $knowl.slideDown("slow");
                    }]);
                }
            } else {
                // Get code from server.
                console.log("loadPartial: ID=" + knowl_id);
                $output.loadPartial(knowl_id, undefined, undefined,
                    function (response, status, xhr) {
                        $output.removeClass("loading");
                        if (status == "error") {
                            $link.removeClass("active");
                            $output.html("<div class='error'>Knowl Error 1: ID =" + knowl_id + " / " +
                            xhr.status + " " + xhr.statusText + '</div>');
                            $output.show();
                        } else if (status == "timeout") {
                            $link.removeClass("active");
                            $output.html("<div class='error'>Knowl timeout: " + xhr.status + " " + xhr.statusText + '</div>');
                            $output.show();
                        } else {
                            $knowl.hide();
                            $link.addClass("active");
                        }
                        collscientia.include($output);
                        collscientia.create_sagecell_links($output);
                        collscientia.process_mathjax($output, function() {
                            $knowl.slideDown("slow");
                        });
                    }
                );
                //$output.load(url, "section.content",
                //    function (response, status, xhr) {
                //        $knowl.removeClass("loading");
                //        if (status == "error") {
                //            $link.removeClass("active");
                //            $output.html("<div class='knowl-output error'>ERROR: " + xhr.status + " " + xhr.statusText + '</div>');
                //            $output.show();
                //        } else if (status == "timeout") {
                //            $link.removeClass("active");
                //            $output.html("<div class='knowl-output error'>ERROR: timeout. " + xhr.status + " " + xhr.statusText + '</div>');
                //            $output.show();
                //        } else {
                //            $knowl.hide();
                //            $link.addClass("active");
                //        }
                //        // if we are using MathJax, then we reveal the knowl after it has finished rendering the contents
                //        if (window.MathJax == undefined) {
                //            $knowl.slideDown("slow");
                //        } else {
                //            MathJax.Hub.Queue(['Typeset', MathJax.Hub, $output.get(0)]);
                //            MathJax.Hub.Queue([function () {
                //                $knowl.slideDown("slow");
                //            }]);
                //        }
                //    }
                //);
            }
        }
    },
    "process_mathjax": function($where, callback) {
        if (window.MathJax != undefined) {
            MathJax.Hub.Queue(['Typeset', MathJax.Hub, $where.get(0)]);
            MathJax.Hub.Queue([callback]);
        }
    },
    "include": function ($where) {
        'use strict';

        //if (typeof $where === "undefined") {
        $where = $("div[include]");
        //} else {
        //    $where = $where.find("div[include]");
        //}

        $where.each(function () {
            'use strict';

            var $this = $(this);
            if ($this.attr("status") == "done") {
                return;
            }
            var include_id = $this.attr("include");
            var label = $this.attr("label");
            var limit = $this.attr("limit");
            if (typeof limit !== "undefined") {
                limit = parseInt(limit);
            }
            console.log("include_id: ", include_id, " label:", label, " limit: " + limit);
            $this.loadPartial(include_id, label, limit,
                function (response, status, xhr) {
                    if (status == "error") {
                        var msg = "Includes Error: ";
                        $this.html(msg + xhr.status + " " + xhr.statusText);
                    } else {
                        // all good
                        $this.attr("status", "done");
                        collscientia.create_sagecell_links($this);
                        collscientia.process_mathjax($this);
                    }
                }
            );
        });
    },
    "create_sagecell_links": function($block) {
        $block.find("code[mode]").each(function() {
            var $this = $(this);
            var cell_id = $this.attr("id");
            var $a = $("<a>")
                .attr("class", "activate_cell")
                .attr("target", cell_id)
                .text("activate cell");
            $this.after($a);
        });
    },
    "sagecellify": function (cell_id, callback) {
        'use strict';
        var $cell = $("#" + cell_id);
        sagecell.makeSagecell({
            inputLocation: $cell.get(0),
            languages: [$cell.attr("mode")],
            hide: ["permalink", "editorToggle"],
            evalButtonText: 'Evaluate',
            autoeval: true,
            callback: callback
        });
    }
};

function initMathjax() {
    'use strict';
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
    'use strict';
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
    'use strict';
    sagecell.loadMathJax = false;
    sagecell.init(function () {
        document.head.appendChild(
            sagecell.util.createElement("link",
                {rel: "stylesheet", href: "../static/sagecell_overrides.css"}));
    });
}


$(collscientia.init);
$(collscientia.include);
$(initMathjax);
$(initSageCell);
$(googleAnalytics);
