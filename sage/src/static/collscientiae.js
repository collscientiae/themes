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

/* $el.tag() gives you the lowerase tag name */
jQuery.fn.tag = function () {
    'use strict';
    return this.prop("tagName").toLowerCase();
};

/* $el.loadPartial is used to retrive (a possibly cached) HTML fragment from the server
   and replaces the $el's innerHTML with it. Additionally, one can specify a #label
   and a limit (numeric). This is used to just insert a heading with its sub-paragraphs.
 */
jQuery.fn.loadPartial = function (url, label, limit, callback) {
    'use strict';
    var response;
    var $target = this;
    var selector_outer = "section.content";
    console.log("loadPartial: url", url, "label", label, "limit", limit);

    // only make requests if necessary
    if ($target.length == 0) {
        return this;
    }

    // this function does the magic, after either the html is downloaded or coming from cache
    var process_response = function (responseText, from_cache) {
        "use strict";
        from_cache = from_cache === "cached";
        var $snippet, $response;

        if (from_cache) {
            $response = $("<section>").addClass("content").html(responseText);
        } else {
            $response = $(jQuery.parseHTML(responseText)).find(selector_outer);
            collscientiae.store(url, $response);
            collscientiae.update_ui();
        }

        if (typeof label == "undefined" && typeof limit == "undefined") {
            $target.html($response.html());
        } else {
            // the following is actually simple: clone a list of siblings
            // from the match (e.g. h1 header and below: div, div, h2, div, ...)
            // until either there is yet again a h1 header OR a limit is reached.
            // this makes it possible to reference a header from somewhere else by ID
            // and insert it here including the text below the header.
            $snippet = $("<div>");
            var $start;
            if (typeof label == "undefined") {
                $start = $response.children().first();
            } else {
                $start = $response.find("*[label='" + label + "']");
            }
            // console.log("$start", $start);
            $snippet.append($start.clone());
            var endtag = $start.tag();
            var idx_last = -1;
            var idx_all = -1;
            $start.nextUntil(endtag).each(function (idx) {
                // console.log("limit loop: idx", idx);
                if (typeof limit == "undefined" || idx < limit) {
                    $snippet.append($(this).clone());
                    idx_last = idx;
                }
                idx_all = idx;
            });
            if (idx_last < idx_all) {
                var link_to_url = $("<a>").attr("href", url).text("read more ...");
                $snippet.append($("<div>").html(link_to_url));
            }
            $target.html($snippet.html());
        }
        if (from_cache) {
            $target.each(callback, [responseText, "success", undefined]);
        }
    };

    var cached_data = collscientiae.storage[url];
    if (cached_data) {
        console.log("cache hit", url);
        process_response(cached_data, "cached");
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
    "clear_cache": function() {
        "use strict";
        try {
            // the storage could be a {} dict as fallback.
            // ignore error -> init_storage resets it anyways.
            collscientiae.storage.clear();
        } finally {
            collscientiae.init_storage();
        }
        collscientiae.update_ui();
    },
    "init_storage": function () {
        // init storage (clear storage, if root hash is different)
        'use strict';
        var storage = window.localStorage || {};
        var rhash = $('meta[name="doc_root_hash"]').attr("value");
        if (typeof rhash !== "undefined" && storage["DOC_ROOT_HASH"] != rhash) {
            console.log("clearing local storage");
            storage.clear();
        }
        storage["DOC_ROOT_HASH"] = rhash;
        console.log("storage: DOC_ROOT_HASH = " + storage["DOC_ROOT_HASH"]);
        collscientiae.storage = storage;
    },
    "store": function(key, $element) {
        try {
            collscientiae.storage[key] = $element.html();
        } catch (e) {
            //if (e == QUOTA_EXCEEDED_ERR) { // some browsers do not have this error?
            // quota exceed -> clear all and re-init. TODO: LRU cache
            collscientiae.clear_cache();
        }
    },
    "init_sage_cells": function ($body) {
        // activate sage cells
        'use strict';
        $body.on("click", "a.activate_cell", function (event) {
            'use strict';
            event.preventDefault();
            var $activate_link = $(this);
            var cell_id = $activate_link.attr("target");
            $activate_link.text("loading ...");
            $activate_link.removeAttr("target");
            collscientiae.sagecellify(cell_id, function () {
                $activate_link.hide();
            });
        });

        // highlight sagecells on hover over activation link
        $body.on("mouseenter mouseleave", "a.activate_cell", function (evt) {
            'use strict';
            var $this = $(this);
            var cellid = $this.attr("target");
            if (typeof cellid !== "undefined") {
                var hover = evt.type == "mouseenter";
                $this.toggleClass("hover", hover);
                $('#' + cellid).toggleClass("hover", hover);
            }
        });

        // highlight originating activation button when mouse is inside a sagecell
        $body.on("mouseenter mouseleave", "div.sagecell_init > code", function (evt) {
            'use strict';
            var $this = $(this).parent();
            var cellid = $this.attr("id");
            var hover = evt.type == "mouseenter";
            $this.toggleClass("hover", hover);
            $('a.activate_cell[target="' + cellid + '"]').toggleClass("hover", hover);
        });
    },
    "init_knowl_links": function ($body) {
        // handle clicks on knowls
        "use strict";
        $body.on("click", "*[knowl]", function (event) {
            'use strict';
            event.preventDefault();
            var $this = $(this);
            if (event.shiftKey) {
                // shift-knowl-click opens it like a usual link
                window.location.href = "../" + $this.attr("knowl") + ".html";
            } else {
                collscientiae.handle_knowl($this);
            }
        });

        // highlight knowl output on hover over knowl link
        $body.on("mouseenter mouseleave", "*[knowl]", function (evt) {
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
        $body.on("mouseenter mouseleave", "div.knowl", function (evt) {
            'use strict';
            var $this = $(this);
            var uid = $this.attr("id").substring(5);
            var hover = evt.type == "mouseenter";
            $this.toggleClass("hover", hover);
            $('*[knowl-uid=' + uid + ']').toggleClass("hover", hover);
        });
    },
    "init": function () {
        'use strict';
        var $body = $("body");
        collscientiae.init_storage();
        collscientiae.init_sage_cells($body);
        collscientiae.init_knowl_links($body);
        var $section_content = $('section.content');
        var url = window.location.href.split("/").slice(-2).join("/");
        collscientiae.store("../" + url, $section_content);
        collscientiae.create_sagecell_links($section_content);
        collscientiae.highlight_code($section_content);
        collscientiae.include($section_content);
        collscientiae.update_ui();
    },
    "update_ui": function() {
        'use strict';
        // this updates various dynamic elements on the website
        $("#cache_size").text(collscientiae.storage.length);
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
        var url;
        if (knowl_id.indexOf("/") >= 0) {
            // If there is a slash, it's because this is the namespace prefix
            url = "../" + knowl_id + ".html";
        } else {
            url = "./" + knowl_id + ".html";
        }
        console.log("knowl url: ", url);
        // create the element for the content, insert it after the one where the
        // knowl element is included (e.g. inside a <h1> tag) (sibling in DOM)
        var idtag = "id='" + output_id.substring(1) + "'";
        //var kid = "id='kuid-" + uid + "'";

        var label = $link.attr("label");
        var limit = $link.attr("limit");
        if (typeof limit !== "undefined") {
            limit = parseInt(limit);
        }

        // if we already have the content, toggle visibility
        if ($output_id.length > 0) {
            $("#kuid-" + uid).slideToggle("slow");
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
                /* } else if ($link.parent().css('display') == "block" || $link.parent().is("p")) {
                 $link.parent().after($knowl);
                 } else if ($link.parent().parent().css('display') == "block" || $link.parent().parent().is("p")) {
                 $link.parent().parent().after($knowl); */
            } else if ($link.parent().parent().parent().hasClass("indextable")) {
                // The case, where knowls are used in indextables
                $link.after($knowl);
            } else {
                //$link.parent().parent().parent().after($knowl);
                $link.parent().after($knowl);
            }


            var $output = $knowl.find(output_id);
            //var $knowl = $("#kuid-" + uid);
            $output.addClass("loading");
            $knowl.hide();

            // Get data from server.
            $output.loadPartial(url, label, limit,
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
                    collscientiae.process_mathjax($output, function () {
                        $knowl.slideDown("slow");
                    });
                    collscientiae.highlight_code($output);
                    collscientiae.include($output);
                }
            );
        }
    },
    "highlight_code": function($where) {
        "use strict";
        $where.find("div[mode]>code").each(function () {
            Prism.highlightElement($(this)[0]);
         });
    },
    "process_mathjax": function ($where, callback) {
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

        $where.each(function () {
            'use strict';

            var $this = $(this);

            // if no parents set -> we are in the inital call of a possible recursive loop
            if (typeof parents === "undefined") {
                // init parents array with document id, unless inside a knowl
                if ($this.parents().filter("div.knowl").length == 0) {
                    var doc_id = $("meta[name='doc_id']").attr("value");
                    parents = new Array(doc_id);
                } else {
                    parents = new Array();
                }
            }

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
            if (parents.some(function (p) { return p == include_id; })) {
                console.log("Circular import detected: ", include_id, "parents:", parents);
                $this.html($("<span>")
                    .addClass("circular")
                    .text("Circular import to ")
                    .append($("<a>")
                        .attr("href", "../" + include_id + ".html")
                        .text("'" + include_id + "'")));
                return;
            }

            var url = "../" + include_id + ".html";
            console.log("loadPartial()", url, " label:", label, " limit:", limit);
            $this.loadPartial(url, label, limit,
                function (response, status, xhr) {
                    if (status == "error") {
                        var msg = "Includes Error: ";
                        $this.html(msg + xhr.status + " " + xhr.statusText);
                    } else {
                        // all good
                        $this.attr("status", "done");
                        collscientiae.create_sagecell_links($this);
                        collscientiae.process_mathjax($this);
                        collscientiae.highlight_code($this);
                        // need to create a shallow copy of it and rename it
                        // (name clash of scopes, what a buggy language!)
                        var parents2 = parents.slice();
                        parents2.push(include_id);
                        collscientiae.include($this, parents2);
                    }
                }
            );
        });
    },
    "create_sagecell_links": function ($block) {
        'use strict';
        $block.find("code[type='text/x-sage']").each(function () {
            'use strict';
            var $this = $(this).parent();
            var cell_id = $this.attr("id");
            var $a = $("<a>")
                .attr("class", "activate_cell")
                .attr("target", cell_id)
                .text("Activate Code-Cell");
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
        "  TeX: {extensions: ['autoload-all.js'], equationNumbers: { autoNumber: 'AMS' } }\n" +
        "});";
    head.appendChild(script);
    script = document.createElement("script");
    script.type = "text/javascript";
    script.src = proto + "://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML";
    head.appendChild(script);
}

function googleAnalytics() {
    'use strict';
    var uaid = $("meta[name='google_analytics']").first().attr("account");
    if (uaid !== null) {
        (function (i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r;
            i[r] = i[r] || function () {
                (i[r].q = i[r].q || []).push(arguments)
            }, i[r].l = 1 * new Date();
            a = s.createElement(o);
            m = s.getElementsByTagName(o)[0];
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

// extending Prism.js for sage and r

Prism.languages.python['function'] = /\b([a-zA-Z_]+)(?=\()\b/g;

Prism.languages.sage= {
	'comment': {
		pattern: /(^|[^\\])#.*?(\r?\n|$)/g,
		lookbehind: true
	},
    'function': Prism.languages.python['function'],
	'string': /"""[\s\S]+?"""|("|')(\\?.)*?\1/g,
	'keyword' : /\b(as|assert|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|pass|print|raise|return|try|while|with|yield|var)\b/g,
	'boolean' : /\b(True|False)\b/g,
	'number' : /\b-?(0x)?\d*\.?[\da-f]+\b/g,
	'operator' : /[-+]{1,2}|=?&lt;|=?&gt;|!|={1,2}|(&){1,2}|(&amp;){1,2}|\|?\||\?|\*|\/|~|\^|%|\b(or|and|not)\b/g,
	'ignore' : /&(lt|gt|amp);/gi,
	'punctuation' : /[{}[\];(),.:<>]/g
};

Prism.languages.r = Prism.languages.extend('clike', {
	'function': /\b([a-zA-Z.]+)(?=\()\b/g,
	'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?|NA|-?Infinity)\b/g
});

$(collscientiae.init);
$(initMathjax);
$(initSageCell);
$(googleAnalytics);
