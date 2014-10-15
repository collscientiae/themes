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
    var response;
    var $target = this;
    var url = "../" + part_id + ".html";
    var selector_outer = "section.content";

    // only make requests if necessary
    if ($target.length == 0) {
        return this;
    }

    // this function does the magic, after either the html is downloaded or coming from cache
    var process_response = function(responseText, from_cache) {
        "use strict";
        from_cache = from_cache === "cached";
        console.log("from_cache:", from_cache);
        var $knowl, $response;

        if (from_cache) {
            $response = $("<section>").addClass("content").html(responseText);
            // console.log("$response_cached : ", $response.html());
        } else {
            $response = $(jQuery.parseHTML(responseText)).find(selector_outer);
            // console.log("$response_uncached : ", $response.html());
            collscientiae.storage[url] = $response.html();
        }

        console.log("$response", $response);
        if (typeof label == "undefined") {
            $knowl = $response;
        } else {
            // the following is actually simple: clone a list of siblings
            // from the match (e.g. h1 header and below: div, div, h2, div, ...)
            // until either there is yet again a h1 header OR a limit is reached.
            // this makes it possible to reference a header from somewhere else by ID
            // and insert it here including the text below the header.
            $knowl = $("<div>");
            var $start = $response.find("*[label='" + label + "']");
            $knowl.append($start.clone());
            var endtag = $start.tag();
            $start.nextUntil(endtag).each(function (idx) {
                // console.log(idx, $(this).html());
                if (typeof limit == "undefined" || idx < limit) {
                    $knowl.append($(this).clone());
                }
            });
        }
        $target.html($knowl);
        $target.each(callback, [responseText, "success", undefined]);
    };

    if (collscientiae.storage.getItem(url)) {
        console.log("cache hit", url);
        process_response(collscientiae.storage[url], "cached");
    } else {
        console.log("cache miss", url);
        jQuery.ajax({
            url: url,
            dataType: "html"
        })
        .done(process_response)
        .complete(callback && function (jqXHR, status) {
            $target.each(callback, response || [jqXHR.responseText, status, jqXHR]);
        });
    }
    return this;
};

var collscientiae = {
    "knowl_id_counter": 0,
    "storage": undefined,
    "init": function () {
        'use strict';
        { // init storage (clear storage, if root hash is different)

            var storage = window.localStorage || {};
            var rhash = $("meta[name='doc_root_hash']").attr("value");
            if (typeof rhash !== "undefined" && storage["DOC_ROOT_HASH"] != rhash) {
                console.log("clearing local storage");
                storage.clear();
            }
            console.log("storage: ", storage);
            storage["DOC_ROOT_HASH"] = rhash;
            console.log("storage: DOC_ROOT_HASH = " + storage["DOC_ROOT_HASH"]);
            collscientiae.storage = storage;
        }
        {   // activate sage cells
            var $body = $("body");
            $body.on("click", "a.activate_cell", function (event) {
                'use strict';
                event.preventDefault();
                var cell_id = $(this).attr("target");
                var $activate_link = $(this);
                $activate_link.text("loading ...");
                $activate_link.removeAttr("target");
                collscientiae.sagecellify(cell_id, function () {
                    $activate_link.hide();
                });
            });
        }

        {   // handle clicks on knowls
            $body.on("click", "*[knowl]", function (event) {
                'use strict';
                event.preventDefault();
                var $knowl = $(this);
                collscientiae.handle_knowl($knowl);
            });

            // highlight knowl output on hover over knowl link
            $body.on("mouseenter mouseleave", "*[knowl]", function(evt) {
                'use strict';
                var $this = $(this);
                var uid = $this.attr("knowl-uid");
                if (typeof uid !== "undefined") {
                    var hover = evt.type == "mouseenter";
                    $this.toggleClass("hover", hover);
                    $('#kuid-' + uid).toggleClass("hover", hover);
                }
            });

            // highlight originating knowl link when mouse is inside an actual knowl
            $body.on("mouseenter mouseleave", "div.knowl", function(evt) {
                'use strict';
                var $this = $(this);
                var uid = $this.attr("id").substring(5);
                var hover = evt.type == "mouseenter";
                $this.toggleClass("hover", hover);
                $('*[knowl-uid=' + uid + ']').toggleClass("hover", hover);
            });
        }
        collscientiae.create_sagecell_links($("section.content"));
    },
    "handle_knowl": function ($link) {
        'use strict';

        var knowl_id = $link.attr("knowl");
        // each knowl "link" needs to have a unique ID
        // this uid is necessary if we want to reference the same content several times
        if (!$link.attr("knowl-uid")) {
            $link.attr("knowl-uid", collscientiae.knowl_id_counter);
            collscientiae.knowl_id_counter++;
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
                .addClass("knowl hover")
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
                var $kwrapped = $("<tr>").append($("<td>").attr("colspan", cols).append($knowl));
                $link.parents().eq(1).after($kwrapped);
            } else if ($link.parent().is("li")) {
                $link.parent().after($knowl);

                // the following is implemented stupidly, but I had to do it quickly.
                // someone please replace it with an appropriate loop -- DF
                // the '.is("p")' is for the first paragraph of a theorem or proof
                //also, after you close the knowl, it still has a shaded background
            } else if ($link.parent().parent().is("li")) {
                $link.parent().parent().after($knowl);
            } else if ($link.parent().css('display') == "block" || $link.parent().is("p")) {
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

            // Get code from server.
            console.log("loadPartial: ID=" + knowl_id);
            $output.loadPartial(knowl_id, undefined, undefined,
                function (response, status, xhr) {
                    'use strict';
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
                        $link.addClass("active hover");
                    }
                    collscientiae.create_sagecell_links($output);
                    collscientiae.process_mathjax($output, function() {
                        $knowl.slideDown("slow");
                    });
                    collscientiae.include($output);
                }
            );
        }
    },
    "process_mathjax": function($where, callback) {
        'use strict';
        if (window.MathJax != undefined) {
            MathJax.Hub.Queue(['Typeset', MathJax.Hub, $where.get(0)]);
            MathJax.Hub.Queue([callback]);
        }
    },
    "include": function ($where, parents) {
        'use strict';
        // $where the element where to search for include divs
        // parents the stack of parent includes -- to avoid circular imports!

        if (typeof $where === "undefined") {
            //$where = $("div[include]");
            console.log("ERROR: $where is undefined");
            return;
        } else {
            $where = $where.find("div[include]");
        }
        if (typeof parents === "undefined") {
            // init array with itself
            var doc_id = $("meta[name='doc_id']").attr("value")
            parents = new Array(doc_id);
        }

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

            // TODO check circular based on include_id only -> maybe include label?
            if(parents.some(function(p) { return p == include_id})) {
                console.log("Circular import detected: ", include_id, "parents:", parents);
                $this.html($("<span>")
                    .addClass("circular")
                    .text("Circular import to ")
                    .append($("<a>")
                        .attr("href", "../" + include_id + ".html")
                        .text("'" + include_id + "'")));
                return;
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
                        collscientiae.create_sagecell_links($this);
                        collscientiae.process_mathjax($this);
                        // need to create a shallow copy of it!
                        parents = parents.slice();
                        parents.push(include_id);
                        collscientiae.include($this, parents);
                    }
                }
            );
        });
    },
    "create_sagecell_links": function($block) {
        'use strict';
        $block.find("code[mode]").each(function() {
            'use strict';
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


$(collscientiae.init);
$(function() { collscientiae.include($("section.content")) });
$(initMathjax);
$(initSageCell);
$(googleAnalytics);
