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

    var _selectedServer = null, _currentRegistration = null;


    function registerServer(server, widget) {
        var $consoleContainer = widget.find(".consoleContainer"),
            $consoleMessages = $consoleContainer.find(".messages");
        
        function onStarted(evt, success, message) {
            widget.removeClass("state-starting").addClass("state-running");
            widget.find(".stop:disabled").attr("disabled", null);
            widget.find(".start").attr("disabled", "disabled");
        }

        function onExited(evt, success) {
            widget.removeClass("state-stopping");
            widget.find(".start").attr("disabled", null);
            widget.find(".stop").attr("disabled", "disabled");
            
            // Unregister event handlers
            unregister();
        }
        
        function onMessage(evt, message) {
            var messageHtml = Mustache.render(tmpl.consoleMessage, message);
            $consoleMessages.append($(messageHtml));
            setTimeout( function() {
                $consoleContainer.scrollTop($consoleMessages.height());
            }, 300);
        }
        
        
        function unregister() {
            $(server).off("tomcat.started", onStarted);
            $(server).off("tomcat.exited", onExited);
            $(server).off("tomcat.message", onMessage);
        }

        $(server).on("tomcat.started", onStarted);
        $(server).on("tomcat.exited", onExited);
        $(server).on("tomcat.message", onMessage);
        
        return {
            unregister: unregister  
        };
    }


    function start(widget) {
        var _self = widget;
        _self.find(".start").attr("disabled", "disabled");
        _self.addClass("state-starting");
        var server = configurations.getServer(_selectedServer);
        return tomcat.start(server).done(function() {
            _currentRegistration = registerServer(server, _self);
        });
    }


    function stop(widget) {
        var _self = widget;
        _self.find(".stop").attr("disabled", "disabled");
        _self.addClass("state-stopping");
        var server = configurations.getServer(_selectedServer);
        return tomcat.stop( server );
    }


    function clearConsole(widget) {
        var _self = widget;
        return _self.find(".messages").empty();
    }


    function selectServer(widget) {
        var _self  = widget;
        var val    = _self.find(".actionsContainer select.serverList option:selected").attr("value");
        var server = configurations.getServer(val);
        
        if ( _currentRegistration ) {
            _currentRegistration.unregister();
            _currentRegistration = null;
        }
        
        _selectedServer = val;

        //
        // Figure out what to do with the action buttons...  This is based on
        // the state of the selected server.
        //

        if ( !server ) {
            _self.find(".start, .stop").attr("disabled", "disabled");
        }
        else {
            if ( server._instance ) {
                _currentRegistration = registerServer(server, _self);
            }

            switch( (server._instance || {}).status ) {
                case "starting":
                case "running":
                    _self.find(".stop").attr("disabled", null);
                    _self.find(".start").attr("disabled", "disabled");
                    break;
                // Everything else will enable the start button and disable the stop button.
                //case "ready":
                //case "stopping":
                default:
                    _self.find(".stop").attr("disabled", "disabled");
                    _self.find(".start").attr("disabled", null);
            }
        }
    }


    function initWidget(widget) {
        var _self = widget.addClass("tomcatManager");
        _self.html($(tmpl.tomcatManager));
        _self.find(".consoleContainer").append($(tmpl.console));

        _self.on("click.tomcatManager", ".start", function() {start(widget);})
            .on("click.tomcatManager", ".stop", function() {stop(widget);})
            .on("click.tomcatManager", ".clearConsole", function() {clearConsole(widget);})
            .change("select.serverList", function() {selectServer(widget);});

        $(configurations).on("load", function(event, config) {
            _selectedServer = null;
            var $actionsHtml = $(Mustache.render(tmpl.actions, configurations));
            $actionsHtml.appendTo(widget.find(".actionsContainer").empty());
            $actionsHtml.children("select.serverList option").eq(0).attr("selected", "selected");
            selectServer(widget);
        });

        return _self;
    }


    $.fn.tomcatManager = function( options ) {
        var _widget = this;

        return _widget.each(function() {
            var $this = $(this);
            
            if ( $this.data("tomcatManager") ) {
                return $this;
            }
            
            initWidget.apply($this, [$this, options]);
            return $this.data("tomcatManager", true);
        });
    };

});

