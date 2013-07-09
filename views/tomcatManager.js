/*
 * Copyright (c) 2013 Miguel Castillo.
 *
 * Licensed under MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */


define( function(require, exports, module) {
    "use strict";

    var tomcat           = require("../Tomcat"),
        configurations   = require("../ConfigurationManager");

    var tmpl = {
        tomcatManager: require("text!views/tomcatManager.html"),
        console: require("text!views/console.html"),
        consoleMessage: require("text!views/consoleMessage.html"),
        actions: require("text!views/actions.html")
    };


    // States a server can be in:
    // ready, starting, running, stopping

    var _server = null, $tomcatManager = null;


    configurations.ready(function() {
        function iterate( config, callback ) {
            var servers = config.Servers;
            for ( var iServer in servers ) {
                if ( servers.hasOwnProperty(iServer) === false ) {
                    continue;
                }

                callback(configurations.getServerDetails(iServer));
            }
        }


        $(configurations).on("load", function(event, config) {
            _server = null;
            var $actionsHtml = $(Mustache.render(tmpl.actions, configurations));
            $actionsHtml.appendTo($tomcatManager.find(".actionsContainer").empty());
            $actionsHtml.children("select.serverList option").eq(0).attr("selected", "selected");
            selectServer($tomcatManager);
        });


        $(configurations).on("unload", function(event, config) {
            //iterate(config, uninit);
        });
    });


    function instanceManager(instance, widget) {
        _server._instance = instance;
        var $consoleContainer = widget.find(".consoleContainer"),
            $consoleMessages = $consoleContainer.find(".messages");

        $(instance).on("tomcat.started", function(evt, success, message) {
            widget.removeClass("state-starting").addClass("state-running");
            widget.find(".stop:disabled").attr("disabled", null);
            widget.find(".start").attr("disabled", "disabled");
            _server.status = "running";
        });

        $(instance).on("tomcat.exited", function(evt, success) {
            widget.removeClass("state-stopping");
            widget.find(".start:disabled").attr("disabled", null);
            widget.find(".stop").attr("disabled", "disabled");
            _server.status = "ready";
        });

        $(instance).on("tomcat.message", function(evt, message) {
            var messageHtml = Mustache.render(tmpl.consoleMessage, message);
            $consoleMessages.append($(messageHtml));
            $consoleContainer.scrollTop($consoleMessages.height());
        });
    }



    function init(widget) {
        var _self = widget.addClass("tomcatManager");
        _self.html($(tmpl.tomcatManager));
        _self.find(".consoleContainer").append($(tmpl.console));

        _self.on("click.tomcatManager", ".start", function() {start(widget);})
        .on("click.tomcatManager", ".stop", function() {stop(widget);})
        .on("click.tomcatManager", ".clearConsole", function() {clearConsole(widget);})
        .change("select.serverList", function() {selectServer(widget);});
        return _self;
    }


    function start(widget) {
        var _self = widget;
        if ( _server ) {
            _server.status = "starting";
            _self.find(".start").attr("disabled", "disabled");
            _self.addClass("state-starting");
            return tomcat.start(_server).done(function(instance) {
                instanceManager(instance, _self);
            });
        }
    }


    function stop(widget) {
        var _self = widget;
        if ( _server && _server._instance ) {
            _server.status = "stopping";
            _self.find(".stop").attr("disabled", "disabled");
            _self.addClass("state-stopping");
            return tomcat.stop( _server._instance );
        }
    }


    function clearConsole(widget) {
        var _self = widget;
        return _self.find(".messages").empty();
    }


    function selectServer(widget) {
        var _self = widget;
        var val = _self.find(".actionsContainer select.serverList option:selected").attr("value");
        _server = configurations.getServerDetails(val);

        //
        // Figure out what to do with the action buttons...  This is based on
        // the state of the selected server.
        //

        if ( !_server ) {
            _self.find(".start, .stop").attr("disabled", "disabled");
        }
        else {
            switch( _server.status ) {
                case "starting":
                case "running":
                    _self.find(".start").attr("disabled", "disabled");
                    break;
                case "ready":
                case "stopping":
                    _self.find(".stop").attr("disabled", "disabled");
                    break;
                default:
                    _self.find(".stop").attr("disabled", "disabled");
            }
        }
    }


    $.fn.tomcatManager = function( options ) {
        var _widget = this;

        if ( $tomcatManager ) {
            return $tomcatManager;
        }

        $tomcatManager = _widget;
        return _widget.each(function() {
            var $this = $(this);
            init.apply($this, [$this, options]);
        });
    };

});

